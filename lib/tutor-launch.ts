import type { AssistAnswerMode } from "./ai-types";

export const TUTOR_LAUNCH_INTENTS = ["image", "text", "history"] as const;
export const TUTOR_LAUNCH_PANELS = ["composer", "history"] as const;

export type TutorLaunchIntent = (typeof TUTOR_LAUNCH_INTENTS)[number];
export type TutorLaunchPanel = (typeof TUTOR_LAUNCH_PANELS)[number];

export function buildTutorLaunchHref(input: {
  intent?: TutorLaunchIntent;
  panel?: TutorLaunchPanel;
  source?: string;
  favorites?: boolean;
  subject?: string;
  grade?: string;
  answerMode?: AssistAnswerMode;
} = {}) {
  const searchParams = new URLSearchParams();

  if (input.intent) {
    searchParams.set("intent", input.intent);
  }
  if (input.panel || input.intent === "history") {
    searchParams.set("panel", input.panel ?? "history");
  }
  if (input.source?.trim()) {
    searchParams.set("source", input.source.trim());
  }
  if (input.favorites) {
    searchParams.set("favorites", "1");
  }
  if (input.subject?.trim()) {
    searchParams.set("subject", input.subject.trim());
  }
  if (input.grade?.trim()) {
    searchParams.set("grade", input.grade.trim());
  }
  if (input.answerMode?.trim()) {
    searchParams.set("answerMode", input.answerMode);
  }

  const query = searchParams.toString();
  return query ? `/tutor?${query}` : "/tutor";
}
