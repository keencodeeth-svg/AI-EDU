import { generateImageAssistAnswer } from "@/lib/ai";
import { assessAiQuality } from "@/lib/ai-quality-control";
import { badRequest, unauthorized } from "@/lib/api/http";
import { createAiRoute } from "@/lib/api/domains";

const MAX_SIZE_MB = 5;
const MAX_IMAGE_COUNT = 3;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_ROLES = ["student", "teacher", "parent", "admin", "school_admin"] as const;
const ANSWER_MODE_OPTIONS = ["answer_only", "step_by_step", "hints_first"] as const;

export const POST = createAiRoute({
  role: [...ALLOWED_ROLES],
  cache: "private-realtime",
  handler: async ({ request, user }) => {
    if (!user) {
      unauthorized();
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      badRequest("multipart/form-data is required");
    }

    const formData = await request.formData();
    const question = String(formData.get("question") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim() || undefined;
    const grade = String(formData.get("grade") ?? "").trim() || undefined;
    const answerMode = String(formData.get("answerMode") ?? "").trim();
    const pickedEntries = formData.getAll("images");
    const entries = pickedEntries.length ? pickedEntries : [formData.get("image")].filter(Boolean);

    if (!entries.length) {
      badRequest("missing image");
    }
    if (entries.length > MAX_IMAGE_COUNT) {
      badRequest(`最多上传 ${MAX_IMAGE_COUNT} 张图片`);
    }
    if (answerMode && !ANSWER_MODE_OPTIONS.includes(answerMode as (typeof ANSWER_MODE_OPTIONS)[number])) {
      badRequest("invalid answerMode");
    }

    const images: Array<{ mimeType: string; base64: string }> = [];
    for (const entry of entries) {
      if (!(entry instanceof File)) continue;
      if (!ALLOWED_TYPES.includes(entry.type)) {
        badRequest(`不支持的图片类型：${entry.type}`);
      }

      const sizeMb = entry.size / (1024 * 1024);
      if (sizeMb > MAX_SIZE_MB) {
        badRequest(`单张图片不能超过 ${MAX_SIZE_MB}MB`);
      }

      const buffer = Buffer.from(await entry.arrayBuffer());
      images.push({
        mimeType: entry.type,
        base64: buffer.toString("base64")
      });
    }

    if (!images.length) {
      badRequest("missing image");
    }

    const normalizedAnswerMode = answerMode
      ? (answerMode as (typeof ANSWER_MODE_OPTIONS)[number])
      : undefined;

    const response = await generateImageAssistAnswer({
      question: question || undefined,
      subject,
      grade,
      answerMode: normalizedAnswerMode,
      images
    });

    const quality = assessAiQuality({
      kind: "assist",
      taskType: "assist",
      provider: response.provider,
      textBlocks: [response.recognizedQuestion ?? "", response.answer, ...response.steps, ...response.hints],
      listCountHint: response.steps.length + response.hints.length
    });

    return {
      recognizedQuestion: response.recognizedQuestion,
      answer: response.answer,
      steps: response.steps,
      hints: response.hints,
      source: response.sources,
      provider: response.provider,
      quality
    };
  }
});
