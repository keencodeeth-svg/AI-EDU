import { requireRole } from "@/lib/guard";
import { generateKnowledgeTreeDraft } from "@/lib/ai";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import { isAllowedSubject, previewTreeBatchBodySchema } from "@/lib/api/schemas/admin";
import { parseJson } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

export const POST = withApi(async (request) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, previewTreeBatchBodySchema);

  const subjects = Array.isArray(body.subjects)
    ? body.subjects.map((item) => item.trim()).filter(Boolean)
    : [];
  const grades = Array.isArray(body.grades) ? body.grades.map((item) => item.trim()).filter(Boolean) : [];

  if (!subjects.length || !grades.length) {
    badRequest("subjects and grades required");
  }

  const normalizedSubjects = subjects.filter((item) => isAllowedSubject(item));
  if (!normalizedSubjects.length) {
    badRequest("invalid subjects");
  }

  const combos: Array<{ subject: string; grade: string }> = [];
  normalizedSubjects.forEach((subject) => {
    grades.forEach((grade) => combos.push({ subject, grade }));
  });

  if (combos.length > 18) {
    badRequest("too many combinations (max 18)");
  }

  const items: any[] = [];
  const failed: { subject: string; grade: string; reason: string }[] = [];

  for (const combo of combos) {
    const draft = await generateKnowledgeTreeDraft({
      subject: combo.subject,
      grade: combo.grade,
      edition: body.edition?.trim() || "人教版",
      volume: body.volume?.trim() || "上册",
      unitCount: body.unitCount,
      chaptersPerUnit: body.chaptersPerUnit,
      pointsPerChapter: body.pointsPerChapter
    });

    if (!draft) {
      failed.push({ subject: combo.subject, grade: combo.grade, reason: "AI 生成失败" });
      continue;
    }

    items.push({ subject: combo.subject, grade: combo.grade, units: draft.units });
  }

  return { items, failed };
});
