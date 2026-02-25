import { getCurrentUser } from "@/lib/auth";
import { withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  return { user };
});
