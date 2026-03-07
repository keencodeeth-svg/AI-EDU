import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher } from "@/lib/classes";
import { getRulesByClassIds } from "@/lib/notification-rules";
import { createNotificationsBulk } from "@/lib/notifications";
import { buildTeacherNotificationPlan } from "@/lib/teacher-notification-engine";
import { appendTeacherNotificationHistory } from "@/lib/teacher-notification-history";
import { selectTeacherNotificationAssignmentSamples } from "@/lib/teacher-notification-samples";
import { badRequest, notFound, unauthorized } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";
import { createLearningRoute } from "@/lib/api/domains";

const runNotificationBodySchema = v.object<{
  classId?: string;
  enabled?: boolean;
  dueDays?: number;
  overdueDays?: number;
  includeParents?: boolean;
}>(
  {
    classId: v.optional(v.string({ minLength: 1 })),
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

    const body = await parseJson(request, runNotificationBodySchema);
    const hasOverrides =
      body.enabled !== undefined ||
      body.dueDays !== undefined ||
      body.overdueDays !== undefined ||
      body.includeParents !== undefined;
    if (hasOverrides && !body.classId) {
      badRequest("classId required when overriding rule");
    }

    const classes = await getClassesByTeacher(user.id);
    const targetClasses = body.classId ? classes.filter((item) => item.id === body.classId) : classes;
    if (!targetClasses.length) {
      notFound("class not found");
    }

    const rules = await getRulesByClassIds(targetClasses.map((item) => item.id));
    const ruleOverrides = body.classId
      ? [
          {
            classId: body.classId,
            enabled: body.enabled,
            dueDays: body.dueDays,
            overdueDays: body.overdueDays,
            includeParents: body.includeParents
          }
        ]
      : [];

    const plan = await buildTeacherNotificationPlan({
      classes: targetClasses,
      rules,
      ruleOverrides
    });

    const notifications = [] as Array<{
      userId: string;
      title: string;
      content: string;
      type: string;
    }>;

    for (const classPlan of plan.classPlans) {
      for (const assignmentPlan of classPlan.assignmentPlans) {
        const title = assignmentPlan.stage === "overdue" ? "作业已逾期" : "作业即将到期";
        const type = assignmentPlan.stage === "overdue" ? "assignment_overdue" : "assignment_due";
        const content = `${classPlan.className} · ${assignmentPlan.title}（截止 ${new Date(assignmentPlan.dueDate).toLocaleDateString(
          "zh-CN"
        )}）`;

        notifications.push(
          ...assignmentPlan.pendingStudentIds.map((studentId) => ({
            userId: studentId,
            title,
            content,
            type
          })),
          ...assignmentPlan.parentNotificationUserIds.map((parentId) => ({
            userId: parentId,
            title,
            content,
            type
          }))
        );
      }
    }

    await createNotificationsBulk(notifications);

    appendTeacherNotificationHistory({
      teacherId: user.id,
      executedAt: new Date().toISOString(),
      scope: {
        classIds: plan.classPlans.map((item) => item.classId)
      },
      totals: plan.totals,
      classResults: plan.classPlans.map((item) => ({
        classId: item.classId,
        className: item.className,
        subject: item.subject,
        grade: item.grade,
        rule: item.rule,
        assignmentTargets: item.assignmentTargets,
        dueSoonAssignments: item.dueSoonAssignments,
        overdueAssignments: item.overdueAssignments,
        studentTargets: item.studentTargets,
        parentTargets: item.parentTargets,
        uniqueStudents: item.uniqueStudents,
        sampleAssignments: selectTeacherNotificationAssignmentSamples(item.assignmentPlans, 8).map((assignment) => ({
          assignmentId: assignment.assignmentId,
          title: assignment.title,
          dueDate: assignment.dueDate,
          stage: assignment.stage,
          studentTargets: assignment.pendingStudentIds.length,
          parentTargets: assignment.parentNotificationUserIds.length
        }))
      }))
    });

    return {
      data: {
        students: plan.totals.studentTargets,
        parents: plan.totals.parentTargets,
        classes: plan.totals.enabledClasses,
        assignments: plan.totals.assignmentTargets,
        dueSoonAssignments: plan.totals.dueSoonAssignments,
        overdueAssignments: plan.totals.overdueAssignments
      }
    };
  }
});
