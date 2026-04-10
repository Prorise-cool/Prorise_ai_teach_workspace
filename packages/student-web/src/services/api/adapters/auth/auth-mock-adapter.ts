/**
 * 文件说明：基于本地 fixtures 的认证 mock adapter。
 */
import {
  getMockCaptchaEnvelope,
  getMockCurrentUserEnvelope,
  getMockLoginEnvelope,
  getMockLogoutEnvelope,
  getMockRegisterEnabledEnvelope,
  getMockRegisterEnvelope,
  getMockSocialAuthUrl,
} from "@/services/mock/fixtures/auth";
import { type AuthAdapter } from "./auth-mappers";
import {
  mapRuoyiLoginToken,
  mapRuoyiCaptchaPayload,
  mapRuoyiUserInfo,
} from "./auth-mappers";

/**
 * 在微任务中执行 mock 逻辑，模拟异步接口语义。
 *
 * @param operation - 需要执行的 mock 操作。
 * @returns 异步化后的 mock 执行结果。
 */
function runMockOperation<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
}

/**
 * 创建基于本地 fixtures 的认证 mock adapter。
 *
 * @returns mock 认证 adapter。
 */
export function createMockAuthAdapter(): AuthAdapter {
  return {
    login(input) {
      return runMockOperation(() =>
        mapRuoyiLoginToken(getMockLoginEnvelope(input).data),
      );
    },
    register(input) {
      return runMockOperation(() => {
        getMockRegisterEnvelope(input);
      });
    },
    getCaptcha() {
      return runMockOperation(() =>
        mapRuoyiCaptchaPayload(getMockCaptchaEnvelope().data),
      );
    },
    getRegisterEnabled() {
      return runMockOperation(() => {
        const registerValue = getMockRegisterEnabledEnvelope().data;
        return Boolean(registerValue);
      });
    },
    getSocialAuthUrl(input) {
      return runMockOperation(() => getMockSocialAuthUrl(input));
    },
    logout() {
      return runMockOperation(() => {
        getMockLogoutEnvelope();
      });
    },
    getCurrentUser(accessToken) {
      return runMockOperation(() =>
        mapRuoyiUserInfo(getMockCurrentUserEnvelope(accessToken).data),
      );
    },
  };
}
