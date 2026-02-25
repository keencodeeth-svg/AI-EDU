import { getCurrentUser } from "@/lib/auth";
import { acknowledgeTeacherAlert, getTeacherAlerts } from "@/lib/teacher-alerts";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, parseParams, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const ackParamsSchema = v.object<{ id: string }>(
  {
    id: v.string({ minLength: 1 })
  },
  { allowUnknown: true }
);

const ackBodySchema = v.object<{ note?: string }>(
  {
    note: v.optional(v.string({ allowEmpty: true }))
  },
  { allowUnknown: false }
);

export const POST = withApi(async (request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const params = parseParams(context.params, ackParamsSchema);
  const body = await parseJson(request, ackBodySchema);

  const overview = await getTeacherAlerts({
    teacherId: user.id,
    includeAcknowledged: true
  });
  const target = overview.alerts.find((item) => item.id === params.id);
  if (!target) {
    notFound("not found");
  }

  const ack = await acknowledgeTeacherAlert({
    teacherId: user.id,
    alertId: params.id,
    note: body.note
  });

  return {
    data: {
      id: params.id,
      status: "acknowledged",
      acknowledgedAt: ack?.createdAt ?? new Date().toISOString(),
      note: ack?.note ?? null
    }
  };
});

