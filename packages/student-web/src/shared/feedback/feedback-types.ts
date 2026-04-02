export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';

export type FeedbackNoticeInput = {
  tone?: FeedbackTone;
  title: string;
  description?: string;
  durationMs?: number;
  loading?: boolean;
};

export type FeedbackNotice = {
  id: string;
  tone: FeedbackTone;
  title: string;
  description?: string;
  durationMs: number;
  loading: boolean;
  phase: 'entered' | 'leaving';
};

export type FeedbackSpotlightInput = FeedbackNoticeInput;

export type FeedbackSpotlight = {
  id: string;
  tone: FeedbackTone;
  title: string;
  description?: string;
  durationMs: number;
  loading: boolean;
};

export type FeedbackApi = {
  notify: (input: FeedbackNoticeInput) => string;
  dismissNotice: (id: string) => void;
  showSpotlight: (input: FeedbackSpotlightInput) => string;
  hideSpotlight: () => void;
};
