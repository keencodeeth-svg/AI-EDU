import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassStudents } from "@/lib/classes";
import { ensureExamAssignmentsForPaper, getExamPaperById, getExamSubmissionsByPaper } from "@/lib/exams";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    unauthorized();
  }

  const paperId = context.params.id;
  const paper = await getExamPaperById(paperId);
  if (!paper) {
    notFound("not found");
  }

  const klass = await getClassById(paper.classId);
  if (!klass || klass.teacherId !== user.id) {
    notFound("not found");
  }

  const students = await getClassStudents(paper.classId);
  const assignments = await ensureExamAssignmentsForPaper(paper.id);
  const submissions = await getExamSubmissionsByPaper(paper.id);
  const assignmentMap = new Map(assignments.map((item) => [item.studentId, item]));
  const submissionMap = new Map(submissions.map((item) => [item.studentId, item]));

  const header = ["学生姓名", "邮箱", "状态", "得分", "总分", "得分率", "提交时间"];
  const rows = students.map((student) => {
    const assignment = assignmentMap.get(student.id);
    const submission = submissionMap.get(student.id);
    const status = assignment?.status ?? (submission ? "submitted" : "pending");
    const score = assignment?.score ?? submission?.score ?? "";
    const total = assignment?.total ?? submission?.total ?? "";
    const rate =
      typeof score === "number" && typeof total === "number" && total > 0
        ? `${Math.round((score / total) * 100)}%`
        : "";
    const submittedAt = assignment?.submittedAt ?? submission?.submittedAt ?? "";
    return [student.name, student.email, status, score, total, rate, submittedAt];
  });

  const csv = [header, ...rows].map((row) => row.map((item) => csvCell(item)).join(",")).join("\n");
  const filename = `${paper.title.replace(/[\\/:*?"<>|]/g, "_") || paper.id}-scores.csv`;

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
});
