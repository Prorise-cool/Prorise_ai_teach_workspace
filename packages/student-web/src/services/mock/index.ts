/**
 * 文件说明：汇总 student-web 在 mock 模式下使用的 handlers 与 fixtures。
 */
import { authHandlers } from './handlers/auth';
import { companionHandlers } from './handlers/companion';
import { learningCenterHandlers } from './handlers/learning-center';
import { taskHandlers } from './handlers/task';
import { videoPipelineHandlers } from './handlers/video-pipeline';
import { videoPreprocessHandlers } from './handlers/video-preprocess';
import { videoPublishHandlers } from './handlers/video-publish';
import { videoTaskHandlers } from './handlers/video-task';

export { authMockFixtures } from './fixtures/auth';
export { companionMockFixtures } from './fixtures/companion';
export { learningCenterMockFixtures } from './fixtures/learning-center';
export { taskMockFixtures } from './fixtures/task';
export { videoPipelineMockFixtures } from './fixtures/video-pipeline';
export { videoPreprocessMockFixtures } from './fixtures/video-preprocess';
export { videoPublicMockFixtures } from './fixtures/video-public';
export { videoTaskMockFixtures } from './fixtures/video-task';
export { authHandlers } from './handlers/auth';
export { companionHandlers } from './handlers/companion';
export { learningCenterHandlers } from './handlers/learning-center';
export { taskHandlers } from './handlers/task';
export { videoPipelineHandlers } from './handlers/video-pipeline';
export { videoPreprocessHandlers } from './handlers/video-preprocess';
export { videoPublishHandlers } from './handlers/video-publish';
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
  ...companionHandlers,
  ...learningCenterHandlers,
  ...taskHandlers,
  ...videoPipelineHandlers,
  ...videoPreprocessHandlers,
  ...videoPublishHandlers,
  ...videoTaskHandlers,
];
