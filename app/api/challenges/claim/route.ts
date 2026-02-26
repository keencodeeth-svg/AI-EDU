import { getCurrentUser } from "@/lib/auth";
import { claimChallenge, getChallengePoints, getChallengeState } from "@/lib/challenges";
import { badRequest, unauthorized, withApi } from "@/lib/api/http";
import { parseJson, v } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const claimChallengeBodySchema = v.object<{ taskId?: string }>(
  {
    taskId: v.optional(v.string({ allowEmpty: true, trim: false }))
  },
  { allowUnknown: false }
);

export const POST = withApi(async (request) => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const body = await parseJson(request, claimChallengeBodySchema);
  const taskId = body.taskId?.trim();
  if (!taskId) {
    badRequest("missing taskId");
  }

  const result = await claimChallenge(user.id, taskId);
  const state = await getChallengeState(user.id);
  const points = await getChallengePoints(user.id);
  return { data: { tasks: state.tasks, points, result, experiment: state.experiment } };
});
