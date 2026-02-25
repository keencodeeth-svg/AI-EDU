import { getCurrentUser } from "@/lib/auth";
import { generateWritingFeedback } from "@/lib/ai";
import { addWritingSubmission } from "@/lib/writing";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const writingReviewBodySchema = v.object<{
  subject?: string;
  grade?: string;
  title?: string;
  content?: string;
}>(
  {
    subject: v.optional(v.string({ allowEmpty: true, trim: false })),
    grade: v.optional(v.string({ allowEmpty: true, trim: false })),
    title: v.optional(v.string({ allowEmpty: true, trim: false })),
    content: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

function fallbackFeedback(content: string) {
  const length = content.trim().length;
  const base = Math.min(85, Math.max(60, Math.round(length / 3)));
  return {
    scores: {
      structure: base,
      grammar: Math.max(55, base - 5),
      vocab: Math.max(55, base - 8)
    },
    summary: "已完成基础批改，请根据建议优化结构与表达。",
    strengths: ["表达较完整", "有一定连贯性"],
    improvements: ["增加过渡句", "注意语法与标点"],
    corrected: undefined
  };
}

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const body = await parseJson(request, writingReviewBodySchema);
  const subject = body.subject?.trim();
  const grade = body.grade?.trim();
  const title = body.title?.trim() || undefined;
  const content = body.content?.trim();

  if (!content || !subject || !grade) {
    badRequest("missing fields");
  }

  const feedback =
    (await generateWritingFeedback({
      subject,
      grade,
      title,
      content
    })) ?? fallbackFeedback(content);

  const submission = await addWritingSubmission({
    userId: user.id,
    subject,
    grade,
    title,
    content,
    feedback
  });

  return { data: submission };
});
