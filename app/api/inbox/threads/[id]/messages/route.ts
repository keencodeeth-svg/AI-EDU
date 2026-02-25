import { getCurrentUser } from "@/lib/auth";
import { addMessage, getThreadMessages } from "@/lib/inbox";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const threadParamsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

const addMessageBodySchema = v.object<{ content?: string }>(
  {
    content: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

export const POST = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const params = parseParams(context.params, threadParamsSchema);
  const body = await parseJson(request, addMessageBodySchema);
  const content = body.content?.trim();
  if (!content) {
    badRequest("missing content");
  }

  const threadInfo = await getThreadMessages(params.id);
  const isParticipant = threadInfo.participants.some((p) => p.id === user.id);
  if (!isParticipant) {
    notFound("not found");
  }

  const message = await addMessage({ threadId: params.id, senderId: user.id, content });
  return { data: message };
});
