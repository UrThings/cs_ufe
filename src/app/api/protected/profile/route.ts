import { requireUser } from "@/lib/auth/guards";
import { successResponse } from "@/lib/api-response";

export async function GET() {
  const auth = await requireUser();

  if (auth.response) {
    return auth.response;
  }

  return successResponse({ user: auth.user }, "Protected profile fetched.");
}
