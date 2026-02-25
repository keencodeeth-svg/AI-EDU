import { createQuestion } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import {
  importQuestionBodySchema,
  isAllowedSubject,
  normalizeDifficulty,
  trimStringArray
} from "@/lib/api/schemas/admin";
import { parseJson } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

export const POST = withApi(async (request) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, importQuestionBodySchema);

  if (!body.items?.length) {
    badRequest("items required");
  }

  const created: string[] = [];
  const failed: { index: number; reason: string }[] = [];

  for (const [index, item] of body.items.entries()) {
    const subject = item.subject?.trim();
    const grade = item.grade?.trim();
    const knowledgePointId = item.knowledgePointId?.trim();
    const stem = item.stem?.trim();
    const answer = item.answer?.trim();
    const options = trimStringArray(item.options);

    if (!subject || !grade || !knowledgePointId || !stem || !options.length || !answer) {
      failed.push({ index, reason: "missing fields" });
      continue;
    }

    if (!isAllowedSubject(subject)) {
      failed.push({ index, reason: "invalid subject" });
      continue;
    }

    const difficulty = normalizeDifficulty(item.difficulty);

    const next = await createQuestion({
      subject,
      grade,
      knowledgePointId,
      stem,
      options,
      answer,
      explanation: item.explanation?.trim() ?? "",
      difficulty,
      questionType: item.questionType?.trim() || "choice",
      tags: trimStringArray(item.tags),
      abilities: trimStringArray(item.abilities)
    });
    if (next?.id) created.push(next.id);
    else failed.push({ index, reason: "save failed" });
  }

  await addAdminLog({
    adminId: user.id,
    action: "import_questions",
    entityType: "question",
    entityId: null,
    detail: `created=${created.length}, failed=${failed.length}`
  });

  return { created: created.length, failed };
});
