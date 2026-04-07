import { setupWorker } from 'msw/browser';

import { authHandlers } from './handlers/auth';
import { taskHandlers } from './handlers/task';
import { videoPipelineHandlers } from './handlers/video-pipeline';
import { videoPreprocessHandlers } from './handlers/video-preprocess';
import { videoPublishHandlers } from './handlers/video-publish';
import { videoTaskHandlers } from './handlers/video-task';

export const worker = setupWorker(
  ...authHandlers,
  ...taskHandlers,
  ...videoPipelineHandlers,
  ...videoPreprocessHandlers,
  ...videoPublishHandlers,
  ...videoTaskHandlers,
);
