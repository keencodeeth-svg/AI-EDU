import { getStudentContext } from "@/lib/user-context";
import { getStudentProfile } from "@/lib/profiles";
import { getDailyAccuracy, getStatsBetween, getWeakKnowledgePoints, getWeeklyStats } from "@/lib/progress";
import { unauthorized, withApi } from "@/lib/api/http";
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const student = await getStudentContext();
  if (!student) {
    unauthorized();
  }

  const stats = await getWeeklyStats(student.id);
  const profile = await getStudentProfile(student.id);
  const subjects = profile?.subjects?.length ? profile.subjects : ["math"];
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  const prevStart = new Date();
  prevStart.setDate(end.getDate() - 14);
  const previousStats = await getStatsBetween(student.id, prevStart, start);
  const trend = await getDailyAccuracy(student.id, 7);

  const weakPoints = (
    await Promise.all(
      subjects.map(async (subject) =>
        (await getWeakKnowledgePoints(student.id, subject)).map((item) => ({
          id: item.kp.id,
          title: item.kp.title,
          ratio: Math.round(item.ratio * 100),
          total: item.total,
          subject
        }))
      )
    )
  )
    .flat()
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 5);

  const suggestions: string[] = [];
  if (stats.total < 5) {
    suggestions.push("本周练习偏少，建议每天完成 5-8 题。");
  }
  if (stats.accuracy < 60) {
    suggestions.push("正确率偏低，建议先巩固基础知识点，再逐步提升难度。");
  }
  if (stats.accuracy >= previousStats.accuracy + 5) {
    suggestions.push("正确率提升明显，继续保持当前节奏。");
  } else if (stats.accuracy + 5 < previousStats.accuracy) {
    suggestions.push("正确率有所下降，建议复盘错因并进行错题专练。");
  }
  if (weakPoints.length) {
    suggestions.push(`优先巩固：${weakPoints[0].title}。`);
  }

  return {
    student: { id: student.id, name: student.name, grade: student.grade },
    stats,
    previousStats,
    trend,
    weakPoints,
    suggestions
  };
});
