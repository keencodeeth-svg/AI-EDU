import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { ensureExamAssignment, getExamPapersByClassIds } from "@/lib/exams";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const classes = await getClassesByStudent(user.id);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const papers = await getExamPapersByClassIds(classes.map((item) => item.id));

  const data = await Promise.all(
    papers.map(async (paper) => {
      const assignment = await ensureExamAssignment(paper.id, user.id);
      const klass = classMap.get(paper.classId);
      return {
        ...paper,
        className: klass?.name ?? "-",
        classSubject: klass?.subject ?? "-",
        classGrade: klass?.grade ?? "-",
        status: assignment.status,
        score: assignment.score ?? null,
        total: assignment.total ?? null,
        startedAt: assignment.startedAt ?? null,
        submittedAt: assignment.submittedAt ?? null
      };
    })
  );

  return { data };
});
