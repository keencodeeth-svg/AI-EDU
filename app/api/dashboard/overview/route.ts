import { getCurrentUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api/http";
import { createLearningRoute } from "@/lib/api/domains";
import { getDashboardOverview } from "@/lib/dashboard-overview";

export const GET = createLearningRoute({
  cache: "private-realtime",
  handler: async () => {
    const user = await getCurrentUser();
    if (!user) {
      unauthorized();
    }

    const data = await getDashboardOverview(user);
    return { data };
  }
});
