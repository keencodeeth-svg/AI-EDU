import { getCurrentUser } from "@/lib/auth";
import { canAccessLearningLibraryItem } from "@/lib/library-access";
import {
  addLearningLibraryAnnotation,
  getLearningLibraryItemById,
  listLearningLibraryAnnotations
} from "@/lib/learning-library";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const paramsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

const bodySchema = v.object<{
  quote?: string;
  startOffset?: number;
  endOffset?: number;
  color?: string;
  note?: string;
}>(
  {
    quote: v.optional(v.string({ minLength: 1 })),
    startOffset: v.optional(v.number({ integer: true, min: 0, coerce: true })),
    endOffset: v.optional(v.number({ integer: true, min: 0, coerce: true })),
    color: v.optional(v.string({ allowEmpty: true, trim: false })),
    note: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const params = parseParams(context.params, paramsSchema);
  const item = await getLearningLibraryItemById(params.id);
  if (!item) {
    notFound("not found");
  }
  const allowed = await canAccessLearningLibraryItem(user, item);
  if (!allowed) {
    notFound("not found");
  }

  const data = await listLearningLibraryAnnotations(item.id);
  return { data };
});

export const POST = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const params = parseParams(context.params, paramsSchema);
  const item = await getLearningLibraryItemById(params.id);
  if (!item) {
    notFound("not found");
  }
  const allowed = await canAccessLearningLibraryItem(user, item);
  if (!allowed) {
    notFound("not found");
  }

  const body = await parseJson(request, bodySchema);
  const quote = body.quote?.trim();
  if (!quote) {
    badRequest("quote required");
  }

  const annotation = await addLearningLibraryAnnotation({
    itemId: item.id,
    userId: user.id,
    quote,
    startOffset: body.startOffset,
    endOffset: body.endOffset,
    color: body.color?.trim() || undefined,
    note: body.note?.trim() || undefined
  });

  return { data: annotation };
});
