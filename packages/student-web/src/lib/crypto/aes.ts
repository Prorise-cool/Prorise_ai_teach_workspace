/**
 * AES 工具。
 * 复用 RuoYi 认证接口要求的 AES 能力，为当前请求加密流程提供最小实现。
 */
import CryptoJS from 'crypto-js'

function generateRandomString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let index = 0; index < 32; index += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return result
}

export function generateAesKey() {
  return CryptoJS.enc.Utf8.parse(generateRandomString())
}

export function encodeBase64(value: unknown) {
  return CryptoJS.enc.Base64.stringify(value)
}

export function decodeBase64(value: string) {
  return CryptoJS.enc.Base64.parse(value)
}

export function encryptWithAes(message: string, aesKey: unknown) {
  return CryptoJS.AES.encrypt(message, aesKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()
}

export function decryptWithAes(message: string, aesKey: unknown) {
  return CryptoJS.AES.decrypt(message, aesKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8)
}
