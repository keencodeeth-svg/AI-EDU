import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher, getClassStudentIds } from "@/lib/classes";
import { getAssignmentsByClassIds, getAssignmentProgress } from "@/lib/assignments";
import { getKnowledgePoints } from "@/lib/content";
import { getAttemptsByUsers } from "@/lib/progress";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const classes = await getClassesByTeacher(user.id);
  const classIds = classes.map((item) => item.id);

  const studentSet = new Set<string>();
  for (const klass of classes) {
    const ids = await getClassStudentIds(klass.id);
    ids.forEach((id) => studentSet.add(id));
  }
  const studentIds = Array.from(studentSet);

  const assignments = await getAssignmentsByClassIds(classIds);
  const progressLists = await Promise.all(assignments.map((item) => getAssignmentProgress(item.id)));
  const progress = progressLists.flat();

  const completed = progress.filter((item) => item.status === "completed").length;
  const totalProgress = progress.length;
  const completionRate = totalProgress ? Math.round((completed / totalProgress) * 100) : 0;

  const scored = progress.filter(
    (item) => typeof item.score === "number" && typeof item.total === "number" && (item.total ?? 0) > 0
  );
  const scoreSum = scored.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const totalSum = scored.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const accuracy = totalSum ? Math.round((scoreSum / totalSum) * 100) : 0;

  const attempts = await getAttemptsByUsers(studentIds);
  const kpStats = new Map<string, { correct: number; total: number }>();
  attempts.forEach((attempt) => {
    const current = kpStats.get(attempt.knowledgePointId) ?? { correct: 0, total: 0 };
    current.total += 1;
    current.correct += attempt.correct ? 1 : 0;
    kpStats.set(attempt.knowledgePointId, current);
  });

  const knowledgePoints = await getKnowledgePoints();
  const kpMap = new Map(knowledgePoints.map((kp) => [kp.id, kp]));

  const weakPoints = Array.from(kpStats.entries())
    .map(([id, stat]) => {
      const kp = kpMap.get(id);
      const ratio = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
      return {
        id,
        title: kp?.title ?? "未知知识点",
        subject: kp?.subject ?? "-",
        grade: kp?.grade ?? "-",
        ratio,
        total: stat.total
      };
    })
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 5);

  return {
    summary: {
      classes: classes.length,
      students: studentIds.length,
      assignments: assignments.length,
      completionRate,
      accuracy
    },
    weakPoints
  };
});
