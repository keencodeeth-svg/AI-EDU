import { getCurrentUser } from "@/lib/auth";
import { getFavoriteByUserQuestion, removeFavorite, upsertFavorite } from "@/lib/favorites";
import { unauthorized, withApi } from "@/lib/api/http";
import { parseJson, parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const favoriteParamsSchema = v.object<{ questionId: string }>(
  {
    questionId: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

const updateFavoriteBodySchema = v.object<{ tags?: string[]; note?: string }>(
  {
    tags: v.optional(v.array(v.string({ allowEmpty: true, trim: false }))),
    note: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const params = parseParams(context.params, favoriteParamsSchema);
  const favorite = await getFavoriteByUserQuestion(user.id, params.questionId);
  return { data: favorite };
});

export const PATCH = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const params = parseParams(context.params, favoriteParamsSchema);
  const body = await parseJson(request, updateFavoriteBodySchema);
  const tags = Array.isArray(body.tags)
    ? body.tags.map((item) => String(item).trim()).filter(Boolean)
    : undefined;

  const record = await upsertFavorite({
    userId: user.id,
    questionId: params.questionId,
    tags,
    note: body.note
  });

  return { data: record };
});

export const DELETE = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const params = parseParams(context.params, favoriteParamsSchema);
  const removed = await removeFavorite(user.id, params.questionId);
  return { removed };
});
