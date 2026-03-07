import { getParentsByStudentId } from "./auth";
import { getAssignmentsByClass, getAssignmentProgress } from "./assignments";
import { getClassStudentIds } from "./classes";
import type { NotificationRule } from "./notification-rules";

export type TeacherNotificationClass = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

export type TeacherNotificationRuleOverride = {
  classId: string;
  enabled?: boolean;
  dueDays?: number;
  overdueDays?: number;
  includeParents?: boolean;
};

export type ResolvedTeacherNotificationRule = {
  classId: string;
  enabled: boolean;
  dueDays: number;
  overdueDays: number;
  includeParents: boolean;
};

export type TeacherNotificationStage = "due_soon" | "overdue";

export type TeacherNotificationAssignmentPlan = {
  assignmentId: string;
  title: string;
  dueDate: string;
  stage: TeacherNotificationStage;
  pendingStudentIds: string[];
  parentNotificationUserIds: string[];
};

export type TeacherNotificationClassPlan = {
  classId: string;
  className: string;
  subject: string;
  grade: string;
  rule: ResolvedTeacherNotificationRule;
  assignmentPlans: TeacherNotificationAssignmentPlan[];
  assignmentTargets: number;
  dueSoonAssignments: number;
  overdueAssignments: number;
  studentTargets: number;
  parentTargets: number;
  uniqueStudents: number;
};

export type TeacherNotificationPlan = {
  generatedAt: string;
  classPlans: TeacherNotificationClassPlan[];
  totals: {
    classes: number;
    enabledClasses: number;
    assignmentTargets: number;
    dueSoonAssignments: number;
    overdueAssignments: number;
    studentTargets: number;
    parentTargets: number;
    uniqueStudents: number;
  };
};

const DEFAULT_RULE: Omit<ResolvedTeacherNotificationRule, "classId"> = {
  enabled: true,
  dueDays: 2,
  overdueDays: 0,
  includeParents: true
};

export function resolveTeacherNotificationRule(
  classId: string,
  rule?: Partial<Pick<NotificationRule, "enabled" | "dueDays" | "overdueDays" | "includeParents">>
): ResolvedTeacherNotificationRule {
  return {
    classId,
    enabled: rule?.enabled ?? DEFAULT_RULE.enabled,
    dueDays: Number(rule?.dueDays ?? DEFAULT_RULE.dueDays),
    overdueDays: Number(rule?.overdueDays ?? DEFAULT_RULE.overdueDays),
    includeParents: rule?.includeParents ?? DEFAULT_RULE.includeParents
  };
}

function getTeacherNotificationStage(
  dueDate: string,
  rule: ResolvedTeacherNotificationRule,
  nowTs: number
): TeacherNotificationStage | null {
  const dueAt = new Date(dueDate).getTime();
  if (!Number.isFinite(dueAt)) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const dueDiffDays = Math.ceil((dueAt - nowTs) / dayMs);
  const overdueDiffDays = Math.max(0, Math.ceil((nowTs - dueAt) / dayMs));
  const isDueSoon = dueDiffDays >= 0 && dueDiffDays <= (rule.dueDays ?? DEFAULT_RULE.dueDays);
  const isOverdue = dueAt < nowTs;
  const withinOverdueWindow = rule.overdueDays > 0 ? overdueDiffDays <= rule.overdueDays : true;

  if (isDueSoon) return "due_soon";
  if (isOverdue && withinOverdueWindow) return "overdue";
  return null;
}

export async function buildTeacherNotificationPlan(params: {
  classes: TeacherNotificationClass[];
  rules: NotificationRule[];
  ruleOverrides?: TeacherNotificationRuleOverride[];
  nowTs?: number;
}): Promise<TeacherNotificationPlan> {
  const nowTs = params.nowTs ?? Date.now();
  const savedRuleMap = new Map(params.rules.map((rule) => [rule.classId, rule]));
  const overrideMap = new Map((params.ruleOverrides ?? []).map((rule) => [rule.classId, rule]));
  const parentCache = new Map<string, string[]>();

  const classPlans: TeacherNotificationClassPlan[] = [];

  for (const klass of params.classes) {
    const rule = resolveTeacherNotificationRule(klass.id, {
      ...savedRuleMap.get(klass.id),
      ...overrideMap.get(klass.id)
    });

    const assignmentPlans: TeacherNotificationAssignmentPlan[] = [];
    const uniqueStudents = new Set<string>();

    if (rule.enabled) {
      const assignments = await getAssignmentsByClass(klass.id);
      const studentIds = await getClassStudentIds(klass.id);

      for (const assignment of assignments) {
        const stage = getTeacherNotificationStage(assignment.dueDate, rule, nowTs);
        if (!stage) continue;

        const progress = await getAssignmentProgress(assignment.id);
        const progressMap = new Map(progress.map((item) => [item.studentId, item]));
        const pendingStudentIds = studentIds.filter((studentId) => {
          const status = progressMap.get(studentId)?.status ?? "pending";
          return status !== "completed";
        });

        if (!pendingStudentIds.length) continue;

        pendingStudentIds.forEach((studentId) => uniqueStudents.add(studentId));
        const parentNotificationUserIds: string[] = [];

        if (rule.includeParents) {
          for (const studentId of pendingStudentIds) {
            if (!parentCache.has(studentId)) {
              const parents = await getParentsByStudentId(studentId);
              parentCache.set(
                studentId,
                parents.map((parent) => parent.id)
              );
            }
            parentNotificationUserIds.push(...(parentCache.get(studentId) ?? []));
          }
        }

        assignmentPlans.push({
          assignmentId: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate,
          stage,
          pendingStudentIds,
          parentNotificationUserIds
        });
      }
    }

    const assignmentTargets = assignmentPlans.length;
    const dueSoonAssignments = assignmentPlans.filter((item) => item.stage === "due_soon").length;
    const overdueAssignments = assignmentPlans.filter((item) => item.stage === "overdue").length;
    const studentTargets = assignmentPlans.reduce((sum, item) => sum + item.pendingStudentIds.length, 0);
    const parentTargets = assignmentPlans.reduce((sum, item) => sum + item.parentNotificationUserIds.length, 0);

    classPlans.push({
      classId: klass.id,
      className: klass.name,
      subject: klass.subject,
      grade: klass.grade,
      rule,
      assignmentPlans,
      assignmentTargets,
      dueSoonAssignments,
      overdueAssignments,
      studentTargets,
      parentTargets,
      uniqueStudents: uniqueStudents.size
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    classPlans,
    totals: {
      classes: classPlans.length,
      enabledClasses: classPlans.filter((item) => item.rule.enabled).length,
      assignmentTargets: classPlans.reduce((sum, item) => sum + item.assignmentTargets, 0),
      dueSoonAssignments: classPlans.reduce((sum, item) => sum + item.dueSoonAssignments, 0),
      overdueAssignments: classPlans.reduce((sum, item) => sum + item.overdueAssignments, 0),
      studentTargets: classPlans.reduce((sum, item) => sum + item.studentTargets, 0),
      parentTargets: classPlans.reduce((sum, item) => sum + item.parentTargets, 0),
      uniqueStudents: classPlans.reduce((sum, item) => sum + item.uniqueStudents, 0)
    }
  };
}
