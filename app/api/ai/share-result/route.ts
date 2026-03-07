import { AI_HISTORY_ORIGINS } from "@/lib/ai-history";
import type { AiQualityMeta } from "@/lib/ai-types";
import { badRequest, notFound, unauthorized } from "@/lib/api/http";
import { v } from "@/lib/api/validation";
import { createAiRoute } from "@/lib/api/domains";
import { addMessage, createThread, getThreadsForUser } from "@/lib/inbox";
import { buildTutorShareMessage, buildTutorShareSubject, getTutorShareTargets } from "@/lib/tutor-share";

const ANSWER_MODE_OPTIONS = ["answer_only", "step_by_step", "hints_first"] as const;
const QUALITY_RISK_OPTIONS = ["low", "medium", "high"] as const;

const qualitySchema = v.object<AiQualityMeta>(
  {
    confidenceScore: v.number({ min: 0, max: 100, integer: true }),
    riskLevel: v.enum(QUALITY_RISK_OPTIONS),
    needsHumanReview: v.boolean(),
    fallbackAction: v.string({ maxLength: 200 }),
    reasons: v.array(v.string({ minLength: 1, maxLength: 120 }), { maxLength: 8 }),
    minQualityScore: v.optional(v.number({ min: 0, max: 100, integer: true })),
    policyViolated: v.optional(v.boolean())
  },
  { allowUnknown: false }
);

const shareResultBodySchema = v.object<{
  targetId: string;
  question: string;
  answer: string;
  recognizedQuestion?: string;
  origin?: (typeof AI_HISTORY_ORIGINS)[number];
  subject?: string;
  grade?: string;
  answerMode?: (typeof ANSWER_MODE_OPTIONS)[number];
  provider?: string;
  steps?: string[];
  hints?: string[];
  quality?: AiQualityMeta;
}>(
  {
    targetId: v.string({ minLength: 1 }),
    question: v.string({ minLength: 1, maxLength: 2000 }),
    answer: v.string({ minLength: 1, maxLength: 8000 }),
    recognizedQuestion: v.optional(v.string({ maxLength: 2000 })),
    origin: v.optional(v.enum(AI_HISTORY_ORIGINS)),
    subject: v.optional(v.string({ maxLength: 40 })),
    grade: v.optional(v.string({ maxLength: 20 })),
    answerMode: v.optional(v.enum(ANSWER_MODE_OPTIONS)),
    provider: v.optional(v.string({ maxLength: 60 })),
    steps: v.optional(v.array(v.string({ minLength: 1, maxLength: 320 }), { maxLength: 6 })),
    hints: v.optional(v.array(v.string({ minLength: 1, maxLength: 320 }), { maxLength: 6 })),
    quality: v.optional(qualitySchema)
  },
  { allowUnknown: false }
);

export const POST = createAiRoute({
  role: ["student", "parent", "teacher", "admin", "school_admin"],
  body: shareResultBodySchema,
  cache: "private-realtime",
  handler: async ({ body, user }) => {
    if (!user) {
      unauthorized();
    }

    if (!body.question.trim() || !body.answer.trim()) {
      badRequest("missing fields");
    }

    const targets = await getTutorShareTargets(user);
    const target = targets.find((item) => item.id === body.targetId);
    if (!target) {
      notFound("share target not found");
    }

    const existingThread = (await getThreadsForUser(user.id)).find(
      (thread) => thread.participants.length === 1 && thread.participants[0]?.id === target.id
    );

    const content = buildTutorShareMessage({
      question: body.question,
      answer: body.answer,
      recognizedQuestion: body.recognizedQuestion,
      origin: body.origin,
      subject: body.subject,
      grade: body.grade,
      answerMode: body.answerMode,
      provider: body.provider,
      steps: body.steps,
      hints: body.hints,
      quality: body.quality,
      target
    });

    let threadId = existingThread?.id ?? "";
    const reused = Boolean(threadId);

    if (threadId) {
      await addMessage({ threadId, senderId: user.id, content });
    } else {
      const created = await createThread({
        subject: buildTutorShareSubject(body),
        senderId: user.id,
        recipientIds: [target.id],
        content
      });
      threadId = created.threadId;
    }

    return {
      data: {
        threadId,
        reused,
        target
      }
    };
  }
});
