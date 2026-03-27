declare module 'crypto-js' {
  const CryptoJS: {
    AES: {
      decrypt: (
        message: string,
        key: unknown,
        options: {
          mode: unknown
          padding: unknown
        },
      ) => { toString: (encoding: unknown) => string }
      encrypt: (
        message: string,
        key: unknown,
        options: {
          mode: unknown
          padding: unknown
        },
      ) => { toString: () => string }
    }
    enc: {
      Base64: {
        parse: (value: string) => unknown
        stringify: (value: unknown) => string
      }
      Utf8: {
        parse: (value: string) => unknown
        stringify?: (value: unknown) => string
      }
    }
    mode: {
      ECB: unknown
    }
    pad: {
      Pkcs7: unknown
    }
  }

  export default CryptoJS
}

declare module 'jsencrypt' {
  export default class JSEncrypt {
    decrypt(value: string): string | false
    encrypt(value: string): string | false
    setPrivateKey(key: string): void
    setPublicKey(key: string): void
  }
}
