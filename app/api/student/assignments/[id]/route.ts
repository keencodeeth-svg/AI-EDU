import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentById, getAssignmentItems, getAssignmentProgressForStudent } from "@/lib/assignments";
import { getQuestions } from "@/lib/content";
import { getModuleById } from "@/lib/modules";
import { notFound, unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_request, context) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const assignmentId = context.params.id;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    notFound("not found");
  }

  const classes = await getClassesByStudent(user.id);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const klass = classMap.get(assignment.classId);
  if (!klass) {
    notFound("not found");
  }

  const items = await getAssignmentItems(assignment.id);
  const questions = await getQuestions();
  const questionMap = new Map(questions.map((item) => [item.id, item]));
  const payloadQuestions = items
    .map((item) => questionMap.get(item.questionId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.id,
      stem: item.stem,
      options: item.options
    }));

  const progress = await getAssignmentProgressForStudent(assignment.id, user.id);

  return {
    assignment,
    module: assignment.moduleId ? await getModuleById(assignment.moduleId) : null,
    class: { id: klass.id, name: klass.name, subject: klass.subject, grade: klass.grade },
    questions: payloadQuestions,
    progress
  };
});
