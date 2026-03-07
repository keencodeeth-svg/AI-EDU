import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher } from "@/lib/classes";
import { getRulesByClassIds } from "@/lib/notification-rules";
import { buildTeacherNotificationPlan } from "@/lib/teacher-notification-engine";
import { selectTeacherNotificationAssignmentSamples } from "@/lib/teacher-notification-samples";
import { notFound, unauthorized } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";
import { createLearningRoute } from "@/lib/api/domains";

const previewNotificationBodySchema = v.object<{
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

export const POST = createLearningRoute({
  cache: "private-realtime",
  handler: async ({ request }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      unauthorized();
    }

    const body = await parseJson(request, previewNotificationBodySchema);
    const classes = await getClassesByTeacher(user.id);
    const targetClass = classes.find((item) => item.id === body.classId);
    if (!targetClass) {
      notFound("class not found");
    }

    const rules = await getRulesByClassIds([targetClass.id]);
    const plan = await buildTeacherNotificationPlan({
      classes: [targetClass],
      rules,
      ruleOverrides: [body]
    });
    const classPlan = plan.classPlans[0];

    return {
      data: {
        generatedAt: plan.generatedAt,
        class: {
          id: targetClass.id,
          name: targetClass.name,
          subject: targetClass.subject,
          grade: targetClass.grade
        },
        rule: classPlan.rule,
        summary: {
          enabled: classPlan.rule.enabled,
          assignmentTargets: classPlan.assignmentTargets,
          dueSoonAssignments: classPlan.dueSoonAssignments,
          overdueAssignments: classPlan.overdueAssignments,
          studentTargets: classPlan.studentTargets,
          parentTargets: classPlan.parentTargets,
          uniqueStudents: classPlan.uniqueStudents
        },
        sampleAssignments: selectTeacherNotificationAssignmentSamples(classPlan.assignmentPlans, 8).map((item) => ({
          assignmentId: item.assignmentId,
          title: item.title,
          dueDate: item.dueDate,
          stage: item.stage,
          studentTargets: item.pendingStudentIds.length,
          parentTargets: item.parentNotificationUserIds.length
        }))
      }
    };
  }
});
