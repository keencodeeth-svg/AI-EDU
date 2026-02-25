import { getKnowledgePoints } from "@/lib/content";
import { withApi } from "@/lib/api/http";
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  return { data: await getKnowledgePoints() };
});
