/**
 * RSA 工具。
 * 负责请求加密场景中的密钥包装，与 AES 工具配合对齐 RuoYi 的认证加密协议。
 */
import JSEncrypt from 'jsencrypt'

import { env } from '@/lib/env'

export function encryptWithRsa(value: string) {
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(env.VITE_APP_RSA_PUBLIC_KEY)

  const encrypted = encryptor.encrypt(value)
  if (!encrypted) {
    throw new Error('RSA 公钥加密失败。')
  }

  return encrypted
}

export function decryptWithRsa(value: string) {
  const encryptor = new JSEncrypt()
  encryptor.setPrivateKey(env.VITE_APP_RSA_PRIVATE_KEY)

  const decrypted = encryptor.decrypt(value)
  if (!decrypted) {
    throw new Error('RSA 私钥解密失败。')
  }

  return decrypted
}
