import type { ExplainVariants, HomeworkReview, QuestionDraft } from "./ai-types";

type ExplainFallbackPayload = {
  stem: string;
  explanation?: string;
  knowledgePointTitle?: string;
};

type HomeworkFallbackPayload = {
  subject: string;
  grade: string;
  focus?: string;
  uploadCount: number;
  submissionType?: "quiz" | "upload" | "essay";
  submissionText?: string | null;
};

export function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function normalizeOption(text: string) {
  return text
    .replace(/^[A-Da-d][\\.、\\)）:：]\\s*/, "")
    .replace(/^选项\\s*[A-Da-d]\\s*[:：]/, "")
    .trim();
}

export function normalizeTitle(text: string) {
  return text
    .replace(/^\\d+[\\.、\\)]\\s*/, "")
    .replace(/^第[一二三四五六七八九十]+[单元章节]\\s*/, "")
    .trim();
}

export function normalizeQuestionDraft(input: any): QuestionDraft | null {
  if (!input || typeof input !== "object") return null;
  const stem = String(input.stem ?? "").trim();
  const explanation = String(input.explanation ?? "").trim();
  const rawOptions = Array.isArray(input.options) ? input.options : [];
  const options = rawOptions
    .map((item: any) => normalizeOption(String(item)))
    .filter(Boolean);
  if (!stem || !explanation || options.length < 4) return null;

  const uniqueOptions: string[] = [];
  options.forEach((opt: string) => {
    if (!uniqueOptions.includes(opt)) uniqueOptions.push(opt);
  });
  if (uniqueOptions.length < 4) return null;
  const normalizedOptions = uniqueOptions.slice(0, 4);
  let answer = String(input.answer ?? "").trim();
  if (!answer) return null;

  const letterMap = { A: 0, B: 1, C: 2, D: 3 } as const;
  const upper = answer.toUpperCase();
  if (upper in letterMap) {
    const idx = letterMap[upper as keyof typeof letterMap];
    if (normalizedOptions[idx]) {
      answer = normalizedOptions[idx];
    }
  }

  if (!normalizedOptions.includes(answer)) {
    return null;
  }

  return { stem, options: normalizedOptions, answer, explanation };
}

export function buildExplainFallback(payload: ExplainFallbackPayload): ExplainVariants {
  const base = (payload.explanation ?? "").trim() || `这道题考查${payload.knowledgePointTitle ?? "基础概念"}。`;
  const parts = base
    .split(/[。！？!?.]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  const visual = parts.length
    ? `图解思路：\n${parts.map((item, idx) => `${idx + 1}) ${item}`).join("\n")}`
    : "图解思路：先读题找关键信息，再代入公式计算。";
  const analogy = `生活类比：把题目理解成生活中的“小份量比较”或“分配问题”，${base}`;
  return {
    text: base,
    visual,
    analogy,
    provider: "rule"
  };
}

export function buildHomeworkFallback(payload: HomeworkFallbackPayload): HomeworkReview {
  const base = payload.focus?.trim() || "作业完成情况与解题思路";
  const isEssay = payload.submissionType === "essay";
  const hasText = Boolean(payload.submissionText?.trim());
  const summaryParts = [];
  if (payload.uploadCount > 0) {
    summaryParts.push(`已收到 ${payload.uploadCount} 份作业材料。`);
  }
  if (hasText) {
    summaryParts.push(isEssay ? "已收到作文文本内容。" : "已收到学生备注。");
  }
  if (!summaryParts.length) {
    summaryParts.push("已收到作业信息。");
  }
  summaryParts.push(`请重点关注：${base}。`);
  const summary = summaryParts.join("");
  const rubric = isEssay
    ? [
        { item: "结构与立意", score: 80, comment: "结构完整，可加强开头点题。" },
        { item: "语言表达", score: 78, comment: "语句通顺，注意用词准确。" },
        { item: "细节与例证", score: 82, comment: "例子较清晰，可补充细节。" },
        { item: "书写规范", score: 85, comment: "书写较清楚，注意标点规范。" }
      ]
    : [
        { item: "解题步骤", score: 80, comment: "步骤基本完整，可再细化关键环节。" },
        { item: "结果准确性", score: 78, comment: "个别题需复核结果。" },
        { item: "书写规范", score: 85, comment: "整体书写清晰。" }
      ];
  return {
    score: 80,
    summary,
    strengths: ["步骤较完整", "书写较清晰"],
    issues: ["个别步骤缺少解释", "部分题目缺少验算"],
    suggestions: ["补充关键步骤说明", "完成后进行自检或验算"],
    rubric,
    writing: isEssay
      ? {
          scores: { structure: 80, grammar: 78, vocab: 79 },
          summary: "表达清晰，建议在结构衔接与词汇丰富度上继续提升。",
          strengths: ["主题明确", "语句通顺"],
          improvements: ["丰富细节描写", "注意段落衔接"],
          corrected: undefined
        }
      : undefined,
    provider: "rule"
  };
}
