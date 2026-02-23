import { errorResponse, successResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  return successResponse({ user }, "Current user fetched.");
}
