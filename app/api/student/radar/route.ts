import { getCurrentUser } from "@/lib/auth";
import { getAbilityRadar } from "@/lib/portrait";
import { unauthorized, withApi } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    unauthorized();
  }

  const abilities = await getAbilityRadar(user.id);
  return { data: { abilities } };
});
