import { getCurrentUser } from "@/lib/auth";
import { getQuestions } from "@/lib/content";
import { getWrongQuestionIds } from "@/lib/progress";
import { unauthorized, withApi } from "@/lib/api/http";
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const wrongIds = await getWrongQuestionIds(user.id);
  const questions = (await getQuestions()).filter((q) => wrongIds.includes(q.id));

  return { data: questions };
});
