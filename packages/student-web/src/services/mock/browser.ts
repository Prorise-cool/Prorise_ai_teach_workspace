import { setupWorker } from 'msw/browser';

import { authHandlers } from './handlers/auth';
import { taskHandlers } from './handlers/task';
import { videoTaskHandlers } from './handlers/video-task';

export const worker = setupWorker(...authHandlers, ...taskHandlers, ...videoTaskHandlers);
