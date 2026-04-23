/**
 * 测验相关类型定义。
 */

export type QuizQuestionType = 'single' | 'multiple' | 'short_answer';

export interface QuizRubric {
  criteria: string[];
  scoringGuide: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  totalPoints?: number;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: QuizOption[];
  answer?: string[];
  analysis?: string;
  rubric?: QuizRubric;
  points?: number;
}

export interface QuizOption {
  label: string;
  value: string;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
}

export interface QuizGradeRequest {
  question: QuizQuestion;
  studentAnswer: string;
}

export interface QuizGradeResult {
  correct: boolean;
  feedback: string;
  score?: number;
}

export interface QuizAttempt {
  answers: QuizAnswer[];
  results: Record<string, QuizGradeResult>;
  submittedAt: number;
  totalScore: number;
  maxScore: number;
}
