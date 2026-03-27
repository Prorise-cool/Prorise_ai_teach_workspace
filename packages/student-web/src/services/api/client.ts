/**
 * 统一 HTTP client。
 * 负责请求头注入、RuoYi 响应解包、认证加密协议和 401 语义收口。
 */
import ky from 'ky'

import { decodeBase64, decryptWithAes, encodeBase64, encryptWithAes, generateAesKey } from '@/lib/crypto/aes'
import { decryptWithRsa, encryptWithRsa } from '@/lib/crypto/rsa'
import { env } from '@/lib/env'
import { clearAuthStorage, getAuthorizationHeader } from '@/lib/storage/auth'

export interface ApiEnvelope<TData> {
  code: number | string
  data: TData
  msg: string
}

export class ApiClientError extends Error {
  code: string
  status: number

  constructor(message: string, status: number, code: string) {
    super(message)
    this.code = code
    this.name = 'ApiClientError'
    this.status = status
  }
}

interface RequestConfig {
  body?: unknown
  encrypted?: boolean
  method: 'GET' | 'POST'
  path: string
  repeatSubmit?: boolean
  requiresAuth?: boolean
}

type UnauthorizedHandler = (message: string) => void

let unauthorizedHandler: UnauthorizedHandler | null = null

const http = ky.create({
  retry: 0,
  throwHttpErrors: false,
})

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler
}

/**
 * 发起统一 API 请求，并按 RuoYi `{ code, msg, data }` 契约返回业务数据。
 */
export async function request<TData>({
  body,
  encrypted = false,
  method,
  path,
  repeatSubmit,
  requiresAuth = true,
}: RequestConfig) {
  const headers = new Headers({
    Accept: 'application/json',
    Clientid: env.VITE_APP_CLIENT_ID,
    'Content-Language': 'zh_CN',
  })

  if (requiresAuth) {
    const authorization = getAuthorizationHeader()
    if (authorization) {
      headers.set('Authorization', authorization)
    }
  } else {
    // 与 RuoYi 前端参考实现保持一致：匿名认证接口显式声明不携带 token。
    headers.set('isToken', 'false')
  }

  let serializedBody: string | undefined
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    if (repeatSubmit === false) {
      headers.set('repeatSubmit', 'false')
    }
    if (encrypted) {
      // 即使开发环境临时关闭参数加密，也保留 RuoYi 认证接口使用的语义头。
      headers.set('isEncrypt', 'true')
    }

    if (encrypted && env.VITE_APP_ENCRYPT === 'Y' && method === 'POST') {
      const aesKey = generateAesKey()
      headers.set(env.VITE_HEADER_FLAG, encryptWithRsa(encodeBase64(aesKey)))
      serializedBody = encryptWithAes(JSON.stringify(body), aesKey)
    } else {
      serializedBody = JSON.stringify(body)
    }
  }

  const response = await http(new URL(path, env.VITE_RUOYI_BASE_URL).toString(), {
    body: serializedBody,
    headers,
    method,
  })

  const envelope = await parseEnvelope<TData>(response)

  if (String(envelope.code) === env.VITE_SERVICE_SUCCESS_CODE) {
    return envelope.data
  }

  handleUnauthorizedIfNeeded(String(envelope.code), envelope.msg)
  throw new ApiClientError(envelope.msg, response.status, String(envelope.code))
}

async function parseEnvelope<TData>(response: Response) {
  const encryptHeader = response.headers.get(env.VITE_HEADER_FLAG)
  const rawText = await response.text()

  if (!rawText) {
    return {
      code: response.status,
      data: undefined as TData,
      msg: response.ok ? '操作成功' : '请求失败',
    }
  }

  if (env.VITE_APP_ENCRYPT === 'Y' && encryptHeader) {
    const decryptedKey = decryptWithRsa(encryptHeader)
    const aesKey = decodeBase64(decryptedKey)
    const decryptedPayload = decryptWithAes(rawText, aesKey)

    return JSON.parse(decryptedPayload) as ApiEnvelope<TData>
  }

  return JSON.parse(rawText) as ApiEnvelope<TData>
}

function handleUnauthorizedIfNeeded(code: string, message: string) {
  const shouldLogout =
    env.VITE_SERVICE_LOGOUT_CODES.split(',').includes(code) ||
    env.VITE_SERVICE_MODAL_LOGOUT_CODES.split(',').includes(code)

  if (!shouldLogout) {
    return
  }

  clearAuthStorage()
  unauthorizedHandler?.(message || '登录状态已失效，请重新登录。')
}
