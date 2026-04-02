/**
 * 文件说明：提供 Story 1.1 所需的认证 MSW handlers。
 */
import { http, HttpResponse } from "msw";

import type { AuthLoginInput, AuthRegisterInput } from "@/types/auth";
import { isAuthSocialSource } from "@/types/auth";
import {
  extractBearerToken,
  getMockCaptchaEnvelope,
  getMockCurrentUserEnvelope,
  getMockLoginEnvelope,
  getMockLogoutEnvelope,
  getMockRegisterEnabledEnvelope,
  getMockRegisterEnvelope,
  getMockSocialAuthUrl,
  normalizeMockAuthError,
} from "@/services/mock/fixtures/auth";
import { readJsonBody, readRecord, readString } from "@/lib/type-guards";

function parseAuthLoginInput(payload: unknown): AuthLoginInput {
  const body = readRecord(payload);

  if (!body) {
    throw new Error("登录请求体必须是 JSON 对象");
  }

  const source = isAuthSocialSource(body.source) ? body.source : undefined;

  return {
    username: readString(body.username),
    password: readString(body.password),
    tenantId: readString(body.tenantId),
    clientId: readString(body.clientId),
    grantType: readString(body.grantType),
    code: readString(body.code),
    uuid: readString(body.uuid),
    source,
    socialCode: readString(body.socialCode),
    socialState: readString(body.socialState),
    returnTo: readString(body.returnTo),
  };
}

function parseAuthRegisterInput(payload: unknown): AuthRegisterInput {
  const body = readRecord(payload);

  if (!body) {
    throw new Error("注册请求体必须是 JSON 对象");
  }

  return {
    username: readString(body.username) ?? "",
    password: readString(body.password) ?? "",
    confirmPassword: readString(body.confirmPassword) ?? "",
    code: readString(body.code),
    uuid: readString(body.uuid),
    tenantId: readString(body.tenantId),
    clientId: readString(body.clientId),
    grantType: readString(body.grantType),
    userType: readString(body.userType),
    returnTo: readString(body.returnTo),
  };
}

function toHttpErrorResponse(error: unknown) {
  const authError = normalizeMockAuthError(error);

  return HttpResponse.json(
    {
      code: authError.status,
      msg: authError.message,
      data: null,
    },
    { status: authError.status },
  );
}

/** 认证 mock handlers 列表。 */
export const authHandlers = [
  http.get("*/auth/code", () => {
    return HttpResponse.json(getMockCaptchaEnvelope(), { status: 200 });
  }),
  http.get("*/auth/register/enabled", () => {
    return HttpResponse.json(getMockRegisterEnabledEnvelope(), { status: 200 });
  }),
  http.get("*/auth/binding/:source", ({ params, request }) => {
    try {
      const source = String(params.source ?? "");
      const requestUrl = new URL(request.url);

      if (!isAuthSocialSource(source)) {
        throw new Error("暂不支持该第三方登录来源");
      }

      return HttpResponse.text(
        getMockSocialAuthUrl({
          source,
          tenantId: requestUrl.searchParams.get("tenantId") ?? undefined,
          domain: requestUrl.searchParams.get("domain") ?? undefined,
        }),
        { status: 200 },
      );
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.post("*/auth/login", async ({ request }) => {
    try {
      const body = parseAuthLoginInput(await readJsonBody(request));

      return HttpResponse.json(getMockLoginEnvelope(body), { status: 200 });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.post("*/auth/register", async ({ request }) => {
    try {
      const body = parseAuthRegisterInput(await readJsonBody(request));

      return HttpResponse.json(getMockRegisterEnvelope(body), { status: 200 });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.post("*/auth/logout", () => {
    return HttpResponse.json(getMockLogoutEnvelope(), { status: 200 });
  }),
  http.get("*/system/user/getInfo", ({ request }) => {
    try {
      const accessToken = extractBearerToken(
        request.headers.get("Authorization"),
      );

      return HttpResponse.json(getMockCurrentUserEnvelope(accessToken), {
        status: 200,
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
];
