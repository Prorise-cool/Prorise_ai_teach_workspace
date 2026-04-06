/**
 * 文件说明：汇总 student-web 在 mock 模式下使用的 handlers 与 fixtures。
 */
import { authHandlers } from './handlers/auth';
import { taskHandlers } from './handlers/task';
import { videoPreprocessHandlers } from './handlers/video-preprocess';
import { videoTaskHandlers } from './handlers/video-task';

export { authMockFixtures } from './fixtures/auth';
export { taskMockFixtures } from './fixtures/task';
export { videoPreprocessMockFixtures } from './fixtures/video-preprocess';
export { videoPublicMockFixtures } from './fixtures/video-public';
export { videoTaskMockFixtures } from './fixtures/video-task';
export { authHandlers } from './handlers/auth';
export { taskHandlers } from './handlers/task';
export { videoPreprocessHandlers } from './handlers/video-preprocess';
export { videoTaskHandlers } from './handlers/video-task';

let mockWorkerStartPromise: Promise<boolean> | null = null;

/** 浏览器环境下按需初始化 MSW worker。 */
export function initializeMockServiceWorker() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (!mockWorkerStartPromise) {
    mockWorkerStartPromise = import('./browser')
      .then(async ({ worker }) => {
        await worker.start({
          onUnhandledRequest: 'bypass',
          serviceWorker: {
            url: '/mockServiceWorker.js'
          }
        });

        return true;
      })
      .catch(error => {
        mockWorkerStartPromise = null;
        throw error;
      });
  }

  return mockWorkerStartPromise;
}

export function resetMockServiceWorkerForTest() {
  mockWorkerStartPromise = null;
}

/** 当前应用对外暴露的全部 mock handlers。 */
export const mockHandlers = [
  ...authHandlers,
  ...taskHandlers,
  ...videoPreprocessHandlers,
  ...videoTaskHandlers,
];
