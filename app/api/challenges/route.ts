import { getCurrentUser } from "@/lib/auth";
import { getChallengePoints, getChallengeStatus } from "@/lib/challenges";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const tasks = await getChallengeStatus(user.id);
  const points = await getChallengePoints(user.id);
  return { data: { tasks, points } };
});
