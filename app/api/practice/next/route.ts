import { getCurrentUser } from "@/lib/auth";
import { getAdaptiveQuestions, getPracticeQuestions, getWrongQuestionIds } from "@/lib/progress";
import { getDueReviewQuestions } from "@/lib/memory";
import { getQuestions } from "@/lib/content";
import { getStudentProfile } from "@/lib/profiles";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const nextQuestionBodySchema = v.object<{
  subject?: string;
  grade?: string;
  knowledgePointId?: string;
  mode?: "normal" | "challenge" | "timed" | "wrong" | "adaptive" | "review";
}>(
  {
    subject: v.optional(v.string({ minLength: 1 })),
    grade: v.optional(v.string({ minLength: 1 })),
    knowledgePointId: v.optional(v.string({ minLength: 1 })),
    mode: v.optional(v.enum(["normal", "challenge", "timed", "wrong", "adaptive", "review"] as const))
  },
  { allowUnknown: false }
);

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const body = await parseJson(request, nextQuestionBodySchema);
  const subject = body.subject ?? "math";
  const profile = await getStudentProfile(user.id);
  const grade = body.grade ?? profile?.grade ?? (user.grade ?? "4");
  let questions = await getPracticeQuestions(subject, grade, body.knowledgePointId);
  if (body.mode === "wrong") {
    const wrongIds = await getWrongQuestionIds(user.id);
    const all = await getQuestions();
    questions = all.filter(
      (q) =>
        wrongIds.includes(q.id) &&
        (!body.subject || q.subject === subject) &&
        (!body.grade || q.grade === grade) &&
        (!body.knowledgePointId || q.knowledgePointId === body.knowledgePointId)
    );
  }
  if (body.mode === "adaptive") {
    questions = await getAdaptiveQuestions({
      userId: user.id,
      subject,
      grade,
      knowledgePointId: body.knowledgePointId
    });
  }
  if (body.mode === "review") {
    questions = await getDueReviewQuestions({
      userId: user.id,
      subject,
      grade,
      limit: 10
    });
  }
  const question = questions[Math.floor(Math.random() * questions.length)];

  if (!question) {
    notFound("no questions");
  }

  return {
    question: {
      id: question.id,
      stem: question.stem,
      options: question.options,
      knowledgePointId: question.knowledgePointId
    }
  };
});
