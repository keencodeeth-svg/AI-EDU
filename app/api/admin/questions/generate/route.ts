import { requireRole } from "@/lib/guard";
import { createQuestion, getKnowledgePoints, getQuestions } from "@/lib/content";
import { generateQuestionDraft } from "@/lib/ai";
import { addAdminLog } from "@/lib/admin-log";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import {
  generateQuestionBodySchema,
  isAllowedSubject,
  normalizeDifficulty
} from "@/lib/api/schemas/admin";
import { parseJson } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

function normalizeStem(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？,.!?;:；：、]/g, "");
}

export const POST = withApi(async (request) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, generateQuestionBodySchema);
  const subject = body.subject?.trim();
  const grade = body.grade?.trim();
  const knowledgePointId = body.knowledgePointId?.trim();

  if (!subject || !grade || !knowledgePointId) {
    badRequest("missing fields");
  }
  if (!isAllowedSubject(subject)) {
    badRequest("invalid subject");
  }
  const difficulty = normalizeDifficulty(body.difficulty);

  const kp = (await getKnowledgePoints()).find((item) => item.id === knowledgePointId);
  if (!kp) {
    notFound("knowledge point not found");
  }
  if (kp.subject !== subject) {
    badRequest("knowledge point mismatch");
  }

  const total = Math.min(Math.max(Number(body.count) || 1, 1), 5);
  const existing = (await getQuestions()).filter(
    (q) => q.subject === subject && q.grade === grade && q.knowledgePointId === knowledgePointId
  );
  const existingStems = new Set(existing.map((q) => normalizeStem(q.stem)));
  const createdStems = new Set<string>();
  const created: Array<{ id: string }> = [];
  const failed: { index: number; reason: string }[] = [];

  for (let i = 0; i < total; i += 1) {
    let draft = null;
    let attempts = 0;
    while (!draft && attempts < 3) {
      attempts += 1;
      const next = await generateQuestionDraft({
        subject,
        grade,
        knowledgePointTitle: kp.title,
        chapter: kp.chapter,
        difficulty
      });
      if (!next) continue;
      const key = normalizeStem(next.stem);
      if (existingStems.has(key) || createdStems.has(key)) {
        continue;
      }
      draft = next;
      createdStems.add(key);
    }

    if (!draft) {
      failed.push({ index: i, reason: "AI 生成失败，请检查模型配置" });
      continue;
    }

    const next = await createQuestion({
      subject,
      grade,
      knowledgePointId,
      stem: draft.stem,
      options: draft.options,
      answer: draft.answer,
      explanation: draft.explanation,
      difficulty,
      questionType: "choice",
      tags: [],
      abilities: []
    });

    if (!next) {
      failed.push({ index: i, reason: "保存题目失败" });
      continue;
    }
    created.push(next);
  }

  await addAdminLog({
    adminId: user.id,
    action: "ai_generate_questions",
    entityType: "question",
    entityId: null,
    detail: `count=${total}, created=${created.length}, failed=${failed.length}`
  });

  return { created, failed };
});
