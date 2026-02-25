import { getCurrentUser, getUserById } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentProgressByStudent, getAssignmentsByClassIds } from "@/lib/assignments";
import { badRequest, notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "parent") {
    unauthorized();
  }

  if (!user.studentId) {
    badRequest("missing student");
  }

  const student = await getUserById(user.studentId);
  if (!student) {
    notFound("student not found");
  }

  const classes = await getClassesByStudent(user.studentId);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const assignments = await getAssignmentsByClassIds(classes.map((item) => item.id));
  const progress = await getAssignmentProgressByStudent(user.studentId);
  const progressMap = new Map(progress.map((item) => [item.assignmentId, item]));

  const data = assignments.map((assignment) => {
    const klass = classMap.get(assignment.classId);
    const record = progressMap.get(assignment.id);
    return {
      id: assignment.id,
      title: assignment.title,
      dueDate: assignment.dueDate,
      className: klass?.name ?? "-",
      subject: klass?.subject ?? "-",
      grade: klass?.grade ?? "-",
      status: record?.status ?? "pending",
      score: record?.score ?? null,
      total: record?.total ?? null,
      completedAt: record?.completedAt ?? null
    };
  });

  const pending = data.filter((item) => item.status !== "completed");
  const dueSoon = pending.filter((item) => {
    const diff = new Date(item.dueDate).getTime() - Date.now();
    return diff >= 0 && diff <= 2 * 24 * 60 * 60 * 1000;
  });
  const overdue = pending.filter((item) => new Date(item.dueDate).getTime() < Date.now());
  const completed = data.filter((item) => item.status === "completed");

  const reminderText = [
    `${student.name}本周作业提醒：待完成 ${pending.length} 份。`,
    overdue.length ? `已逾期 ${overdue.length} 份，请尽快完成。` : "",
    dueSoon.length ? `近 2 天到期 ${dueSoon.length} 份。` : "",
    ...dueSoon.slice(0, 3).map((item) => `- ${item.className} · ${item.title}（截止 ${new Date(item.dueDate).toLocaleDateString("zh-CN")}）`)
  ]
    .filter(Boolean)
    .join("\n");

  return {
    student: { id: student.id, name: student.name },
    data,
    summary: {
      pending: pending.length,
      dueSoon: dueSoon.length,
      overdue: overdue.length,
      completed: completed.length
    },
    reminderText
  };
});
