/**
 * 文件说明：验证认证 mock handlers 的账密、社交入口、未登录态与无权限态。
 */
import { describe, expect, it } from "vitest";

import {
  readBooleanProperty,
  readJsonBody,
  readNumberProperty,
  readRecord,
  readStringProperty,
} from "@/lib/type-guards";
import { authMockFixtures } from "@/services/mock/fixtures/auth";
import { authHandlers } from "@/services/mock/handlers/auth";
import { registerMswServer } from "@/test/utils/msw-server";

registerMswServer(...authHandlers);

async function readJsonRecord(response: Response) {
  const payload = readRecord(await readJsonBody(response));

  if (!payload) {
    throw new Error("认证 mock 响应必须是 JSON 对象");
  }

  return payload;
}

describe("auth mock handlers", () => {
  it("returns a successful login envelope for the admin fixture", async () => {
    const response = await fetch("http://localhost/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "admin123",
      }),
    });

    const payload = await readJsonRecord(response);
    const payloadData = readRecord(payload.data);

    expect(readNumberProperty(payload, "code")).toBe(200);
    expect(readStringProperty(payload, "msg")).toBe("登录成功");
    expect(readStringProperty(payloadData ?? {}, "access_token")).toBe(
      authMockFixtures.tokens.admin,
    );
  });

  it("returns a local social callback url for the binding entry", async () => {
    const response = await fetch(
      "http://localhost/auth/binding/github?tenantId=000000&domain=localhost:4173",
    );
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("/login/social-callback");
    expect(payload).toContain("source=github");
  });

  it("returns a successful register envelope that shares the same domain contract", async () => {
    const response = await fetch("http://localhost/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "new_student",
        password: "Passw0rd!",
        confirmPassword: "Passw0rd!",
        code: "A1B2",
        uuid: "captcha-uuid",
      }),
    });

    const payload = await readJsonRecord(response);

    expect(readNumberProperty(payload, "code")).toBe(200);
    expect(readStringProperty(payload, "msg")).toBe("注册成功");
    expect(payload.data).toBeNull();
  });

  it("returns the backend register toggle and captcha envelope", async () => {
    const registerResponse = await fetch(
      "http://localhost/auth/register/enabled",
    );
    const registerPayload = await readJsonRecord(registerResponse);

    expect(readNumberProperty(registerPayload, "code")).toBe(200);
    expect(readStringProperty(registerPayload, "msg")).toBe("获取成功");
    expect(registerPayload.data).toBe(
      authMockFixtures.settings.registerEnabled,
    );

    const captchaResponse = await fetch("http://localhost/auth/code");
    const captchaPayload = await readJsonRecord(captchaResponse);
    const captchaPayloadData = readRecord(captchaPayload.data);

    expect(readNumberProperty(captchaPayload, "code")).toBe(200);
    expect(readStringProperty(captchaPayload, "msg")).toBe("获取成功");
    expect(
      readBooleanProperty(captchaPayloadData ?? {}, "captchaEnabled"),
    ).toBe(authMockFixtures.settings.captchaEnabled);
  });

  it("returns an unauthorized envelope when current user info is requested without a token", async () => {
    const response = await fetch("http://localhost/system/user/getInfo");

    const payload = await readJsonRecord(response);

    expect(readNumberProperty(payload, "code")).toBe(401);
    expect(readStringProperty(payload, "msg")).toBe(
      "当前会话已失效，请重新登录",
    );
    expect(payload.data).toBeNull();
  });

  it("returns a forbidden envelope for a role-blocked session and supports logout", async () => {
    const infoResponse = await fetch("http://localhost/system/user/getInfo", {
      headers: {
        Authorization: `Bearer ${authMockFixtures.tokens.forbidden}`,
      },
    });
    const infoPayload = await readJsonRecord(infoResponse);

    expect(readNumberProperty(infoPayload, "code")).toBe(403);
    expect(readStringProperty(infoPayload, "msg")).toBe(
      "当前账号暂无小麦学生端访问权限",
    );

    const logoutResponse = await fetch("http://localhost/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authMockFixtures.tokens.admin}`,
      },
    });
    const logoutPayload = await readJsonRecord(logoutResponse);

    expect(readNumberProperty(logoutPayload, "code")).toBe(200);
    expect(readStringProperty(logoutPayload, "msg")).toBe("登出成功");
  });
});
