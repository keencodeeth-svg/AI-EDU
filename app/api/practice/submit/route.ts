import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions } from "@/lib/content";
import { addAttempt } from "@/lib/progress";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const submitBodySchema = v.object<{
  questionId: string;
  answer: string;
}>(
  {
    questionId: v.string({ minLength: 1 }),
    answer: v.string({ minLength: 1 })
  },
  { allowUnknown: false }
);

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const body = await parseJson(request, submitBodySchema);

  const question = (await getQuestions()).find((q) => q.id === body.questionId);
  if (!question) {
    notFound("not found");
  }

  const correct = body.answer === question.answer;
  await addAttempt({
    id: crypto.randomBytes(10).toString("hex"),
    userId: user.id,
    questionId: question.id,
    subject: question.subject,
    knowledgePointId: question.knowledgePointId,
    correct,
    answer: body.answer,
    createdAt: new Date().toISOString()
  });

  return {
    correct,
    answer: question.answer,
    explanation: question.explanation
  };
});
