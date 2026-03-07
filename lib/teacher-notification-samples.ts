import type { TeacherNotificationAssignmentPlan } from "./teacher-notification-engine";

export function selectTeacherNotificationAssignmentSamples(
  assignmentPlans: TeacherNotificationAssignmentPlan[],
  limit = 8
) {
  if (!Array.isArray(assignmentPlans) || limit <= 0) {
    return [] as TeacherNotificationAssignmentPlan[];
  }
  if (assignmentPlans.length <= limit) {
    return [...assignmentPlans];
  }

  const selected: TeacherNotificationAssignmentPlan[] = [];
  const seen = new Set<string>();
  const headCount = Math.ceil(limit / 2);
  const tailCount = Math.max(0, limit - headCount);

  const appendUnique = (item: TeacherNotificationAssignmentPlan) => {
    if (seen.has(item.assignmentId)) {
      return;
    }
    seen.add(item.assignmentId);
    selected.push(item);
  };

  assignmentPlans.slice(0, headCount).forEach(appendUnique);
  assignmentPlans.slice(-tailCount).forEach(appendUnique);

  if (selected.length < limit) {
    assignmentPlans.forEach(appendUnique);
  }

  return selected.slice(0, limit);
}
