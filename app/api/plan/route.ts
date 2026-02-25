import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlan, generateStudyPlans, getStudyPlan, getStudyPlans } from "@/lib/progress";
import { getStudentProfile } from "@/lib/profiles";
import { unauthorized, withApi } from "@/lib/api/http";
import { parseSearchParams, v } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

const planQuerySchema = v.object<{ subject?: string }>(
  {
    subject: v.optional(v.string({ minLength: 1 }))
  },
  { allowUnknown: true }
);

export const GET = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const query = parseSearchParams(request, planQuerySchema);
  const subject = query.subject;
  const profile = await getStudentProfile(user.id);
  const subjects = profile?.subjects?.length ? profile.subjects : ["math"];

  if (!subject || subject === "all") {
    const existing = await getStudyPlans(user.id, subjects);
    const plans = existing.length ? existing : await generateStudyPlans(user.id, subjects);
    const items = plans.flatMap((plan) =>
      plan.items.map((item) => ({ ...item, subject: plan.subject }))
    );
    return { data: { items, plans } };
  }

  const existing = await getStudyPlan(user.id, subject);
  const plan = existing ?? await generateStudyPlan(user.id, subject);
  return { data: plan };
});
