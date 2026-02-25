import { getCurrentUser } from "@/lib/auth";
import { getWritingSubmissionsByUser } from "@/lib/writing";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const list = await getWritingSubmissionsByUser(user.id);
  return { data: list };
});
