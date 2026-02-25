import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher } from "@/lib/classes";
import { getRulesByClassIds, upsertRule } from "@/lib/notification-rules";
import { notFound, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const upsertRuleBodySchema = v.object<{
  classId: string;
  enabled?: boolean;
  dueDays?: number;
  overdueDays?: number;
  includeParents?: boolean;
}>(
  {
    classId: v.string({ minLength: 1 }),
    enabled: v.optional(v.boolean()),
    dueDays: v.optional(v.number({ coerce: true, integer: true, min: 0 })),
    overdueDays: v.optional(v.number({ coerce: true, integer: true, min: 0 })),
    includeParents: v.optional(v.boolean())
  },
  { allowUnknown: false }
);

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const classes = await getClassesByTeacher(user.id);
  const rules = await getRulesByClassIds(classes.map((item) => item.id));
  return { classes, rules };
});

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const body = await parseJson(request, upsertRuleBodySchema);
  const classes = await getClassesByTeacher(user.id);
  if (!classes.find((item) => item.id === body.classId)) {
    notFound("class not found");
  }

  const rule = await upsertRule({
    classId: body.classId,
    enabled: body.enabled ?? true,
    dueDays: Number(body.dueDays ?? 2),
    overdueDays: Number(body.overdueDays ?? 0),
    includeParents: body.includeParents ?? true
  });
  return { data: rule };
});
