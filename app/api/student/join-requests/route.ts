import { getCurrentUser } from "@/lib/auth";
import { getJoinRequestsByStudent } from "@/lib/classes";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const data = await getJoinRequestsByStudent(user.id);
  return { data };
});
