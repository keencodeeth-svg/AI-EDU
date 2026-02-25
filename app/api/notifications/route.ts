import { getCurrentUser } from "@/lib/auth";
import { getNotificationsByUser, markNotificationRead } from "@/lib/notifications";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const markNotificationBodySchema = v.object<{ id?: string }>(
  {
    id: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const data = await getNotificationsByUser(user.id);
  return { data };
});

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  const body = await parseJson(request, markNotificationBodySchema);
  const id = body.id?.trim();
  if (!id) {
    badRequest("missing id");
  }

  const list = await getNotificationsByUser(user.id);
  const existing = list.find((item) => item.id === id);
  if (!existing) {
    notFound("not found");
  }

  const updated = await markNotificationRead(id);
  return { data: updated };
});
