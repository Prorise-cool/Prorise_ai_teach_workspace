/**
 * OpenMAIC types barrel export.
 */
export type { SceneType, StageMode, SceneOutline, SceneContent, SlideContent, QuizContent, InteractiveContent, PBLContent, ClassroomStage, AgentConfig, Scene, PlaybackStatus } from './scene';
export type { Action, ActionType, ActionBase, SpeechAction, WbOpenAction, WbDrawTextAction, WbDrawShapeAction, WbDrawLatexAction, WbDrawLineAction, WbClearAction, WbDeleteAction, WbCloseAction, DiscussionAction, SpotlightAction, LaserAction } from './action';
export { FIRE_AND_FORGET_ACTIONS, SYNC_ACTIONS } from './action';
export type { Classroom, ClassroomMeta, AgentSummary, ClassroomStatus, JobStatus, ClassroomJobResponse, ClassroomCreateRequest } from './classroom';
export type { AgentProfile, AgentPersonality, AgentProfileRequest } from './agent';
export { AGENT_COLORS, DEFAULT_TEACHER_AGENT } from './agent';
export type { ChatMessage, ChatRequest, ChatEvent, SessionType, SessionStatus, LectureNoteEntry, LectureNoteItem } from './chat';
export type { QuizData, QuizQuestion, QuizOption, QuizRubric, QuizAnswer, QuizGradeRequest, QuizGradeResult, QuizAttempt, QuizQuestionType } from './quiz';
export type { SlideData, SlideElement, SlideTheme, SlideBackground, TextElement, ImageElement, LatexElement } from './slides';
