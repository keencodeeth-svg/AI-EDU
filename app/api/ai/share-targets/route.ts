import { unauthorized } from "@/lib/api/http";
import { createAiRoute } from "@/lib/api/domains";
import { getTutorShareTargets } from "@/lib/tutor-share";

export const GET = createAiRoute({
  role: ["student", "parent", "teacher", "admin", "school_admin"],
  cache: "private-short",
  handler: async ({ user }) => {
    if (!user) {
      unauthorized();
    }

    const data = await getTutorShareTargets(user);
    return { data };
  }
});
