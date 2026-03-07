import type { AiHistoryMeta, AiHistoryOrigin } from "@/lib/ai-history";
import type { AiQualityMeta, AssistAnswerMode } from "@/lib/ai-types";

export type TutorHistoryOrigin = AiHistoryOrigin;
export type TutorHistoryOriginFilter = TutorHistoryOrigin | "all";

export type TutorHistoryMeta = AiHistoryMeta;

export type TutorHistoryItem = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  favorite: boolean;
  tags: string[];
  meta?: TutorHistoryMeta;
};

export type TutorHistoryCreatePayload = {
  question: string;
  answer: string;
  meta?: TutorHistoryMeta;
};

export type TutorAnswer = {
  recognizedQuestion?: string;
  answer: string;
  steps?: string[];
  hints?: string[];
  source?: string[];
  provider?: string;
  quality?: AiQualityMeta;
};

export type TutorAskResponse = TutorAnswer & {
  error?: string;
  message?: string;
  data?: TutorAnswer;
};

export type TutorHistoryListResponse = {
  data?: TutorHistoryItem[];
};

export type TutorHistoryItemResponse = {
  data?: TutorHistoryItem;
};

export type TutorShareTarget = {
  id: string;
  name: string;
  role: "teacher" | "parent";
  kind: "teacher" | "parent";
  description: string;
  contextLabels: string[];
};

export type TutorShareTargetsResponse = {
  data?: TutorShareTarget[];
  error?: string;
  message?: string;
};

export type TutorShareResultResponse = {
  data?: {
    threadId: string;
    reused: boolean;
    target: TutorShareTarget;
  };
  error?: string;
  message?: string;
};

export type TutorAnswerMode = AssistAnswerMode;
