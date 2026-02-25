import { getCurrentUser } from "@/lib/auth";
import { getKnowledgePoints, getQuestions } from "@/lib/content";
import { generateExplainVariants } from "@/lib/ai";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const explanationBodySchema = v.object<{ questionId: string }>(
  {
    questionId: v.string({ minLength: 1 })
  },
  { allowUnknown: false }
);

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const body = await parseJson(request, explanationBodySchema);

  const questions = await getQuestions();
  const question = questions.find((q) => q.id === body.questionId);
  if (!question) {
    notFound("question not found");
  }

  const kps = await getKnowledgePoints();
  const kp = kps.find((item) => item.id === question.knowledgePointId);

  const variants = await generateExplainVariants({
    subject: question.subject,
    grade: question.grade,
    stem: question.stem,
    answer: question.answer,
    explanation: question.explanation,
    knowledgePointTitle: kp?.title
  });

  return { data: variants };
});
