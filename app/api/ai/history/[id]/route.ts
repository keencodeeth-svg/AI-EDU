import { getCurrentUser } from "@/lib/auth";
import { deleteHistoryItem, getHistoryByUser, updateHistoryItem } from "@/lib/ai-history";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, parseParams, v } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

const historyParamsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

const updateHistoryBodySchema = v.object<{ favorite?: boolean; tags?: string[] }>(
  {
    favorite: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string({ minLength: 1 })))
  },
  { allowUnknown: false }
);

export const PATCH = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const params = parseParams(context.params, historyParamsSchema);
  const body = await parseJson(request, updateHistoryBodySchema);
  const ownsRecord = (await getHistoryByUser(user.id)).some((item) => item.id === params.id);
  if (!ownsRecord) {
    notFound("not found");
  }

  const next = await updateHistoryItem(params.id, body);
  if (!next) {
    notFound("not found");
  }

  return { data: next };
});

export const DELETE = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const params = parseParams(context.params, historyParamsSchema);
  const ownsRecord = (await getHistoryByUser(user.id)).some((item) => item.id === params.id);
  if (!ownsRecord) {
    notFound("not found");
  }

  const ok = await deleteHistoryItem(params.id);
  if (!ok) {
    notFound("not found");
  }

  return { ok: true };
});
