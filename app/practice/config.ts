import type { PracticeMode } from "./types";

export const STUDENT_PRACTICE_GUIDE_KEY = "guide:student-practice:v1";

export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  normal: "普通练习",
  challenge: "闯关模式",
  timed: "限时模式",
  wrong: "错题专练",
  adaptive: "自适应推荐",
  review: "记忆复习"
};

export const PRACTICE_MODE_OPTIONS: Array<{ value: PracticeMode; label: string }> = [
  { value: "normal", label: "普通练习" },
  { value: "challenge", label: "闯关模式" },
  { value: "timed", label: "限时模式" },
  { value: "wrong", label: "错题专练" },
  { value: "adaptive", label: "自适应推荐" },
  { value: "review", label: "记忆复习" }
];
