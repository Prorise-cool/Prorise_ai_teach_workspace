/**
 * 文件说明：汇总 student-web 在 mock 模式下使用的 handlers 与 fixtures。
 */
import { authHandlers } from './handlers/auth';

export { authMockFixtures } from './fixtures/auth';
export { authHandlers } from './handlers/auth';

/** 当前应用对外暴露的全部 mock handlers。 */
export const mockHandlers = [...authHandlers];
