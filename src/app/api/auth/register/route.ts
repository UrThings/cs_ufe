import { registerSchema, registerAuthSession, AuthServiceError } from "@/features/auth";
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

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsed.error));
  }

  try {
    const session = await registerAuthSession(parsed.data);
    const response = successResponse(
      { user: session.user },
      "Account created successfully.",
      201,
    );

    response.cookies.set(AUTH_COOKIE_NAME, session.token, authCookieOptions);

    return response;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      if (error.code === "USER_EXISTS") {
        return errorResponse(error.message, 409);
      }

      return errorResponse(error.message, 500);
    }

    return errorResponse("Unable to register user.", 500);
  }
}
