import { getCurrentUser } from "@/lib/auth";
import { addHistoryItem, getHistoryByUser } from "@/lib/ai-history";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

const createHistoryBodySchema = v.object<{ question?: string; answer?: string }>(
  {
    question: v.optional(v.string({ allowEmpty: true, trim: false })),
    answer: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }
  const list = await getHistoryByUser(user.id);
  return { data: list };
});

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, createHistoryBodySchema);
  const question = body.question?.trim();
  const answer = body.answer?.trim();
  if (!question || !answer) {
    badRequest("missing fields");
  }

  const next = await addHistoryItem({
    userId: user.id,
    question,
    answer,
    favorite: false,
    tags: []
  });

  return { data: next };
});
