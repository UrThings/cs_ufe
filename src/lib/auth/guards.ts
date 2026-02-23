import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: errorResponse("Unauthorized.", 401) };
  }

  return { user, response: null };
}

export async function requireAdmin() {
  const auth = await requireUser();
  if (!auth.user) {
    return auth;
  }

  if (auth.user.role !== "ADMIN") {
    return { user: null, response: errorResponse("Forbidden.", 403) };
  }

  return { user: auth.user, response: null };
}
