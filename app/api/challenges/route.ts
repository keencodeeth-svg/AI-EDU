import { getCurrentUser } from "@/lib/auth";
import { getChallengePoints, getChallengeState } from "@/lib/challenges";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const state = await getChallengeState(user.id);
  const points = await getChallengePoints(user.id);
  return { data: { tasks: state.tasks, points, experiment: state.experiment } };
});
