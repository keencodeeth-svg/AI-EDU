import { getCurrentUser } from "@/lib/auth";
import { getQuestions } from "@/lib/content";
import { getIntervalLabel, getWrongReviewQueue } from "@/lib/wrong-review";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const queue = await getWrongReviewQueue(user.id);
  const questions = await getQuestions();
  const questionMap = new Map(questions.map((item) => [item.id, item]));

  const mapItem = (item: (typeof queue.dueToday)[number]) => ({
    ...item,
    intervalLabel: getIntervalLabel(item.intervalLevel),
    question: (() => {
      const question = questionMap.get(item.questionId);
      if (!question) return null;
      return {
        id: question.id,
        stem: question.stem,
        options: question.options,
        subject: question.subject,
        grade: question.grade,
        knowledgePointId: question.knowledgePointId
      };
    })()
  });

  return {
    data: {
      summary: queue.summary,
      today: queue.dueToday.map(mapItem),
      upcoming: queue.upcoming.slice(0, 20).map(mapItem)
    }
  };
});

