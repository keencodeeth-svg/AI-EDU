import { getCurrentUser } from "@/lib/auth";
import { ensureObserverCode, rotateObserverCode } from "@/lib/profiles";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }
  const code = await ensureObserverCode(user.id);
  return { data: { code } };
});

export const POST = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }
  const code = await rotateObserverCode(user.id);
  return { data: { code } };
});
