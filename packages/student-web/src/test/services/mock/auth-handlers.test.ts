/**
 * 文件说明：验证认证 MSW handlers 对外暴露的 HTTP 契约。
 */
import { setupServer } from "msw/node";

import {
  readJsonBody,
  readNumberProperty,
  readRecord,
  readStringProperty,
} from "@/lib/type-guards";
import type { RuoyiEnvelope } from "@/types/auth";
import { authHandlers } from "@/services/mock/handlers/auth";

const server = setupServer(...authHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

/**
 * 读取统一包装响应。
 *
 * @param response - Fetch 响应。
 * @returns RuoYi 标准包装对象。
 */
async function readEnvelope(response: Response) {
  const payload = readRecord(await readJsonBody(response));
  const code = payload ? readNumberProperty(payload, "code") : undefined;
  const msg = payload ? readStringProperty(payload, "msg") : undefined;

  if (
    !payload ||
    code === undefined ||
    msg === undefined ||
    !("data" in payload)
  ) {
    throw new Error("认证响应不符合 RuoYi Envelope 契约");
  }

  return {
    code,
    msg,
    data: payload.data,
  } satisfies RuoyiEnvelope<unknown>;
}

describe("authHandlers", () => {
  it("返回登录成功的统一包装 payload", async () => {
    const response = await fetch("http://localhost/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "admin123",
        tenantId: "000000",
      }),
    });

    const payload = await readEnvelope(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      code: 200,
      msg: "登录成功",
      data: {
        access_token: "mock-auth-admin-access-token",
      },
    });
  });

  it("返回第三方登录绑定入口地址", async () => {
    const response = await fetch(
      "http://localhost/auth/binding/github?tenantId=000000&domain=localhost:4173",
    );
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("/login/social-callback");
    expect(payload).toContain("source=github");
  });

  it("返回注册开关与验证码查询结果", async () => {
    const registerResponse = await fetch(
      "http://localhost/auth/register/enabled",
    );
    const registerPayload = await readEnvelope(registerResponse);

    expect(registerResponse.status).toBe(200);
    expect(registerPayload).toMatchObject({
      code: 200,
      msg: "获取成功",
      data: false,
    });

    const captchaResponse = await fetch("http://localhost/auth/code");
    const captchaPayload = await readEnvelope(captchaResponse);

    expect(captchaResponse.status).toBe(200);
    expect(captchaPayload).toMatchObject({
      code: 200,
      msg: "获取成功",
      data: {
        captchaEnabled: false,
      },
    });
  });

  it("对未携带 token 的当前用户请求返回 401", async () => {
    const response = await fetch("http://localhost/system/user/getInfo");
    const payload = await readEnvelope(response);

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      code: 401,
      msg: "当前会话已失效，请重新登录",
    });
  });

  it("对无权限账号返回 403", async () => {
    const response = await fetch("http://localhost/system/user/getInfo", {
      headers: {
        Authorization: "Bearer mock-auth-forbidden-access-token",
      },
    });
    const payload = await readEnvelope(response);

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      code: 403,
      msg: "当前账号暂无小麦学生端访问权限",
    });
  });
});
