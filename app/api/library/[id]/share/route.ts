import { getCurrentUser } from "@/lib/auth";
import { canAccessLearningLibraryItem } from "@/lib/library-access";
import {
  getLearningLibraryItemById,
  issueLearningLibraryShareToken
} from "@/lib/learning-library";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const paramsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

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

  const shared = await issueLearningLibraryShareToken(item.id);
  if (!shared?.shareToken) {
    notFound("not found");
  }

  const origin = new URL(request.url).origin;
  return {
    data: {
      shareToken: shared.shareToken,
      shareUrl: `${origin}/library/shared/${shared.shareToken}`
    }
  };
});
