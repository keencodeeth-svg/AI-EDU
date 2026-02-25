import { getCurrentUser } from "@/lib/auth";
import { refreshStudyPlan } from "@/lib/progress";
import { getStudentProfile } from "@/lib/profiles";
import { unauthorized, withApi } from "@/lib/api/http";
import { v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const refreshPlanBodySchema = v.object<{ subject?: string }>(
  {
    subject: v.optional(v.string({ minLength: 1 }))
  },
  { allowUnknown: false }
);

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const rawBody = (await request.json().catch(() => ({}))) as unknown;
  const body = refreshPlanBodySchema(rawBody, "body");
  const profile = await getStudentProfile(user.id);
  const subjects = profile?.subjects?.length ? profile.subjects : ["math"];

  if (!body.subject || body.subject === "all") {
    const plans = await Promise.all(subjects.map((subject) => refreshStudyPlan(user.id, subject)));
    const items = plans.flatMap((plan) => plan.items.map((item) => ({ ...item, subject: plan.subject })));
    return { data: { items, plans } };
  }

  const plan = await refreshStudyPlan(user.id, body.subject);
  return { data: plan };
});
