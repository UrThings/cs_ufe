import { loginSchema, loginAuthSession, AuthServiceError } from "@/features/auth";
import {
  errorResponse,
  formatZodErrors,
  successResponse,
} from "@/lib/api-response";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/constants";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsed.error));
  }

  try {
    const session = await loginAuthSession(parsed.data);
    const response = successResponse(
      { user: session.user },
      "Login successful.",
    );

    response.cookies.set(AUTH_COOKIE_NAME, session.token, authCookieOptions);

    return response;
  } catch (error) {
    if (error instanceof AuthServiceError && error.code === "INVALID_CREDENTIALS") {
      return errorResponse(error.message, 401);
    }

    return errorResponse("Unable to login user.", 500);
  }
}
