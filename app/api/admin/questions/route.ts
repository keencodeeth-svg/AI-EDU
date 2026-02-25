import { createQuestion, getQuestions } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import {
  createQuestionBodySchema,
  isAllowedSubject,
  normalizeDifficulty,
  trimStringArray
} from "@/lib/api/schemas/admin";
import { parseJson } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }
  const data = await getQuestions();
  return { data };
});

export const POST = withApi(async (request) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, createQuestionBodySchema);
  const subject = body.subject?.trim();
  const grade = body.grade?.trim();
  const knowledgePointId = body.knowledgePointId?.trim();
  const stem = body.stem?.trim();
  const answer = body.answer?.trim();
  const explanation = body.explanation?.trim() ?? "";
  const questionType = body.questionType?.trim() || "choice";

  if (!subject || !grade || !knowledgePointId || !stem || !body.options || !answer) {
    badRequest("missing fields");
  }
  if (!isAllowedSubject(subject)) {
    badRequest("invalid subject");
  }
  const difficulty = normalizeDifficulty(body.difficulty);

  const options = trimStringArray(body.options);
  const tags = trimStringArray(body.tags);
  const abilities = trimStringArray(body.abilities);

  const next = await createQuestion({
    subject,
    grade,
    knowledgePointId,
    stem,
    options,
    answer,
    explanation,
    difficulty,
    questionType,
    tags,
    abilities
  });

  if (next) {
    await addAdminLog({
      adminId: user.id,
      action: "create_question",
      entityType: "question",
      entityId: next.id,
      detail: `${next.subject} ${next.grade} ${next.knowledgePointId}`
    });
  }

  return { data: next };
});
