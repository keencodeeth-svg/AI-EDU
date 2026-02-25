import { getCurrentUser } from "@/lib/auth";
import { getBadges, getStreak, getWeeklyStats } from "@/lib/progress";
import { unauthorized, withApi } from "@/lib/api/http";
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const streak = await getStreak(user.id);
  const badges = await getBadges(user.id);
  const weekly = await getWeeklyStats(user.id);

  return {
    streak,
    badges,
    weekly
  };
});
