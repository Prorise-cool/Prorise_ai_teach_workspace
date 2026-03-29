/**
 * 文件说明：提供 Story 1.1 所需的认证 MSW handlers。
 */
import { http, HttpResponse } from 'msw';

import type { AuthLoginInput, AuthRegisterInput } from '@/types/auth';
import {
  extractBearerToken,
  getMockCurrentUserEnvelope,
  getMockLoginEnvelope,
  getMockLogoutEnvelope,
  getMockRegisterEnvelope,
  normalizeMockAuthError
} from '@/services/mock/fixtures/auth';

function toHttpErrorResponse(error: unknown) {
  const authError = normalizeMockAuthError(error);

  return HttpResponse.json(
    {
      code: authError.status,
      msg: authError.message,
      data: null
    },
    { status: authError.status }
  );
}

/** 认证 mock handlers 列表。 */
export const authHandlers = [
  http.post('*/auth/login', async ({ request }) => {
    try {
      const body = (await request.json()) as AuthLoginInput;

      return HttpResponse.json(getMockLoginEnvelope(body), { status: 200 });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.post('*/auth/register', async ({ request }) => {
    try {
      const body = (await request.json()) as AuthRegisterInput;

      return HttpResponse.json(getMockRegisterEnvelope(body), { status: 200 });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.post('*/auth/logout', () => {
    return HttpResponse.json(getMockLogoutEnvelope(), { status: 200 });
  }),
  http.get('*/system/user/getInfo', ({ request }) => {
    try {
      const accessToken = extractBearerToken(request.headers.get('Authorization'));

      return HttpResponse.json(getMockCurrentUserEnvelope(accessToken), {
        status: 200
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  })
];
