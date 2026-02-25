import { getCurrentUser } from "@/lib/auth";
import { getThreadMessages } from "@/lib/inbox";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const threadParamsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const params = parseParams(context.params, threadParamsSchema);
  const data = await getThreadMessages(params.id, user.id);
  const isParticipant = data.participants.some((p) => p.id === user.id);
  if (!isParticipant) {
    notFound("not found");
  }

  return { data };
});
