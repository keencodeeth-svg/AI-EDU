import { withApi } from "@/lib/api/http";
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  return {
    ok: true,
    service: "k12-ai-tutor",
    ts: new Date().toISOString()
  };
});
