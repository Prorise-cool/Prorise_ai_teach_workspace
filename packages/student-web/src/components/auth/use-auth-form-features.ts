/**
 * 认证表单辅助 Hook。
 * 统一加载租户列表与验证码，避免登录表单和注册表单重复处理同一组联调依赖。
 */
import { useEffect, useState } from 'react'

import { type AuthTenant, type CaptchaInfo, fetchCaptchaCode, fetchTenantList } from '@/lib/api/auth'

/**
 * 加载登录 / 注册共用的租户与验证码配置。
 * 让表单组件专注于字段与提交流程，不重复维护联调前置状态。
 */
export function useAuthFormFeatures() {
  const [captcha, setCaptcha] = useState<CaptchaInfo | null>(null)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [tenantLoading, setTenantLoading] = useState(false)
  const [tenants, setTenants] = useState<AuthTenant[]>([])
  const [tenantEnabled, setTenantEnabled] = useState(false)

  useEffect(() => {
    void loadTenantList()
    void refreshCaptcha()
  }, [])

  async function loadTenantList() {
    setTenantLoading(true)

    try {
      const data = await fetchTenantList()
      setTenantEnabled(data.tenantEnabled)
      setTenants(data.voList)
    } finally {
      setTenantLoading(false)
    }
  }

  async function refreshCaptcha() {
    setCaptchaLoading(true)

    try {
      const data = await fetchCaptchaCode()
      setCaptcha(data)
      return data
    } finally {
      setCaptchaLoading(false)
    }
  }

  return {
    captcha,
    captchaLoading,
    refreshCaptcha,
    tenantEnabled,
    tenantLoading,
    tenants,
  }
}
