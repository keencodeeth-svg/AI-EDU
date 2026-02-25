import { cookies } from "next/headers";
import { clearSessionCookie, getSessionCookieName, removeSession } from "@/lib/auth";
import { apiSuccess, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const POST = withApi(async (_request, _context, { requestId }) => {
  const cookieStore = cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (token) {
    await removeSession(token);
  }

  const response = apiSuccess(
    { ok: true },
    {
      requestId,
      message: "已退出登录"
    }
  );
  clearSessionCookie(response);
  return response;
});
