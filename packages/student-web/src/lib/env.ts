import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_TITLE: z.string().default('Prorise Student Web'),
  VITE_FASTAPI_BASE_URL: z.string().default('http://localhost:8090'),
  VITE_RUOYI_BASE_URL: z.string().default('http://localhost:8080'),
})

export const env = envSchema.parse({
  VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE as string | undefined,
  VITE_FASTAPI_BASE_URL: import.meta.env.VITE_FASTAPI_BASE_URL as string | undefined,
  VITE_RUOYI_BASE_URL: import.meta.env.VITE_RUOYI_BASE_URL as string | undefined,
})
