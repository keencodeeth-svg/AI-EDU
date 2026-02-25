import { requireRole } from "@/lib/guard";
import { getAdminLogs } from "@/lib/admin-log";
import { unauthorized, withApi } from "@/lib/api/http";
import { adminLogsQuerySchema } from "@/lib/api/schemas/admin";
import { parseSearchParams } from "@/lib/api/validation";
export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const user = await requireRole("admin");
  if (!user) {
    unauthorized();
  }

  const query = parseSearchParams(request, adminLogsQuerySchema);
  const limit = Math.min(Math.max(Number(query.limit || 100), 1), 200);
  const logs = await getAdminLogs(limit);
  return { data: logs };
});
