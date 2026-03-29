import { setupWorker } from 'msw/browser';

import { authHandlers } from './handlers/auth';
import { taskHandlers } from './handlers/task';

export const worker = setupWorker(...authHandlers, ...taskHandlers);
