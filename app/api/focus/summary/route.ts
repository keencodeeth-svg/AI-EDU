import { getCurrentUser } from "@/lib/auth";
import { getFocusSummary } from "@/lib/focus";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const data = await getFocusSummary(user.id);
  return { data };
});
