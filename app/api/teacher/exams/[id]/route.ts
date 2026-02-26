import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassStudents } from "@/lib/classes";
import { getQuestions } from "@/lib/content";
import {
  ensureExamAssignmentsForPaper,
  getExamPaperById,
  getExamPaperItems,
  getExamSubmissionsByPaper
} from "@/lib/exams";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

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

  const assignments = await ensureExamAssignmentsForPaper(paper.id);
  const assignmentMap = new Map(assignments.map((item) => [item.studentId, item]));
  const submissions = await getExamSubmissionsByPaper(paper.id);
  const submissionMap = new Map(submissions.map((item) => [item.studentId, item]));
  const students = await getClassStudents(paper.classId);

  const roster = students.map((student) => {
    const assignment = assignmentMap.get(student.id);
    const submission = submissionMap.get(student.id);
    return {
      ...student,
      status: assignment?.status ?? (submission ? "submitted" : "pending"),
      score: assignment?.score ?? submission?.score ?? null,
      total: assignment?.total ?? submission?.total ?? null,
      assignedAt: assignment?.assignedAt ?? null,
      startedAt: assignment?.startedAt ?? null,
      submittedAt: assignment?.submittedAt ?? submission?.submittedAt ?? null
    };
  });

  const items = await getExamPaperItems(paper.id);
  const questionMap = new Map((await getQuestions()).map((item) => [item.id, item]));
  const questions = items
    .map((item) => {
      const question = questionMap.get(item.questionId);
      if (!question) return null;
      return {
        id: question.id,
        stem: question.stem,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
        score: item.score,
        orderIndex: item.orderIndex
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const completed = roster.filter((item) => item.status === "submitted").length;
  const scored = roster.filter(
    (item) => typeof item.score === "number" && typeof item.total === "number" && (item.total ?? 0) > 0
  );
  const avgScore = scored.length
    ? Math.round(
        scored.reduce((sum, item) => sum + ((item.score ?? 0) / (item.total ?? 1)) * 100, 0) / scored.length
      )
    : 0;

  return {
    exam: paper,
    class: {
      id: klass.id,
      name: klass.name,
      subject: klass.subject,
      grade: klass.grade
    },
    summary: {
      assigned: roster.length,
      submitted: completed,
      pending: roster.length - completed,
      avgScore
    },
    questions,
    students: roster
  };
});
