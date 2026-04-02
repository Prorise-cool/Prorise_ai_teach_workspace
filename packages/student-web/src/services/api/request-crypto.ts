/**
 * 文件说明：封装 RuoYi 接口加解密所需的前端辅助能力。
 * 兼容 `api-decrypt.headerFlag=encrypt-key` 的 AES + RSA 协议。
 */
import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';

const RANDOM_SOURCE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function createEncryptor() {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(import.meta.env.VITE_APP_RSA_PUBLIC_KEY);

  return encryptor;
}

function createDecryptor() {
  const encryptor = new JSEncrypt();
  encryptor.setPrivateKey(import.meta.env.VITE_APP_RSA_PRIVATE_KEY);

  return encryptor;
}

function generateRandomString(length: number) {
  let result = '';

  for (let index = 0; index < length; index += 1) {
    result += RANDOM_SOURCE.charAt(
      Math.floor(Math.random() * RANDOM_SOURCE.length)
    );
  }

  return result;
}

function ensureCryptoEnvValue(value: string | undefined, name: string) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} 未配置`);
  }
}

export function isRequestEncryptionEnabled() {
  return import.meta.env.VITE_APP_ENCRYPT === 'Y';
}

export function getRequestEncryptHeaderFlag() {
  return import.meta.env.VITE_HEADER_FLAG || 'encrypt-key';
}

export function generateAesKey() {
  return CryptoJS.enc.Utf8.parse(generateRandomString(32));
}

export function encryptBase64(wordArray: CryptoJS.lib.WordArray) {
  return CryptoJS.enc.Base64.stringify(wordArray);
}

export function decryptBase64(value: string) {
  return CryptoJS.enc.Base64.parse(value);
}

export function encryptWithAes(
  payload: string,
  aesKey: CryptoJS.lib.WordArray
) {
  return CryptoJS.AES.encrypt(payload, aesKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}

export function decryptWithAes(
  payload: string,
  aesKey: CryptoJS.lib.WordArray
) {
  return CryptoJS.AES.decrypt(payload, aesKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8);
}

export function encryptWithRsa(payload: string) {
  ensureCryptoEnvValue(import.meta.env.VITE_APP_RSA_PUBLIC_KEY, 'VITE_APP_RSA_PUBLIC_KEY');

  const encrypted = createEncryptor().encrypt(payload);

  if (!encrypted) {
    throw new Error('RSA 公钥加密失败');
  }

  return encrypted;
}

export function decryptWithRsa(payload: string) {
  ensureCryptoEnvValue(import.meta.env.VITE_APP_RSA_PRIVATE_KEY, 'VITE_APP_RSA_PRIVATE_KEY');

  const decrypted = createDecryptor().decrypt(payload);

  if (!decrypted) {
    throw new Error('RSA 私钥解密失败');
  }

  return decrypted;
}
