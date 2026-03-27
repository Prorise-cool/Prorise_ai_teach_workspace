/**
 * 前端环境变量解析层。
 * 统一收口 student-web 当前联调所需的认证、加密和后端地址配置。
 */
import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_TITLE: z.string().default('Prorise Student Web'),
  VITE_APP_CLIENT_ID: z.string().default('e5cd7e4891bf95d1d19206ce24a7b32e'),
  VITE_APP_ENCRYPT: z.enum(['Y', 'N']).default('Y'),
  VITE_FASTAPI_BASE_URL: z.string().default('http://localhost:8090'),
  VITE_HEADER_FLAG: z.string().default('encrypt-key'),
  VITE_SERVICE_EXPIRED_TOKEN_CODES: z.string().default('9999,9998,3333'),
  VITE_SERVICE_LOGOUT_CODES: z.string().default('401'),
  VITE_SERVICE_MODAL_LOGOUT_CODES: z.string().default('401'),
  VITE_SERVICE_SUCCESS_CODE: z.string().default('200'),
  VITE_APP_RSA_PRIVATE_KEY: z
    .string()
    .default(
      'MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAmc3CuPiGL/LcIIm7zryCEIbl1SPzBkr75E2VMtxegyZ1lYRD+7TZGAPkvIsBcaMs6Nsy0L78n2qh+lIZMpLH8wIDAQABAkEAk82Mhz0tlv6IVCyIcw/s3f0E+WLmtPFyR9/WtV3Y5aaejUkU60JpX4m5xNR2VaqOLTZAYjW8Wy0aXr3zYIhhQQIhAMfqR9oFdYw1J9SsNc+CrhugAvKTi0+BF6VoL6psWhvbAiEAxPPNTmrkmrXwdm/pQQu3UOQmc2vCZ5tiKpW10CgJi8kCIFGkL6utxw93Ncj4exE/gPLvKcT+1Emnoox+O9kRXss5AiAMtYLJDaLEzPrAWcZeeSgSIzbL+ecokmFKSDDcRske6QIgSMkHedwND1olF8vlKsJUGK3BcdtM8w4Xq7BpSBwsloE=',
    ),
  VITE_APP_RSA_PUBLIC_KEY: z
    .string()
    .default(
      'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKoR8mX0rGKLqzcWmOzbfj64K8ZIgOdHnzkXSOVOZbFu/TJhZ7rFAN+eaGkl3C4buccQd/EjEsj9ir7ijT7h96MCAwEAAQ==',
    ),
  VITE_RUOYI_BASE_URL: z.string().default('http://localhost:8080'),
})

export const env = envSchema.parse({
  VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE as string | undefined,
  VITE_APP_CLIENT_ID: import.meta.env.VITE_APP_CLIENT_ID as string | undefined,
  VITE_APP_ENCRYPT: import.meta.env.VITE_APP_ENCRYPT as 'Y' | 'N' | undefined,
  VITE_FASTAPI_BASE_URL: import.meta.env.VITE_FASTAPI_BASE_URL as string | undefined,
  VITE_HEADER_FLAG: import.meta.env.VITE_HEADER_FLAG as string | undefined,
  VITE_SERVICE_EXPIRED_TOKEN_CODES: import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES as string | undefined,
  VITE_SERVICE_LOGOUT_CODES: import.meta.env.VITE_SERVICE_LOGOUT_CODES as string | undefined,
  VITE_SERVICE_MODAL_LOGOUT_CODES: import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES as string | undefined,
  VITE_SERVICE_SUCCESS_CODE: import.meta.env.VITE_SERVICE_SUCCESS_CODE as string | undefined,
  VITE_APP_RSA_PRIVATE_KEY: import.meta.env.VITE_APP_RSA_PRIVATE_KEY as string | undefined,
  VITE_APP_RSA_PUBLIC_KEY: import.meta.env.VITE_APP_RSA_PUBLIC_KEY as string | undefined,
  VITE_RUOYI_BASE_URL: import.meta.env.VITE_RUOYI_BASE_URL as string | undefined,
})
