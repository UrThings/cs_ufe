import { isTeamServiceError, joinTeamByCode, joinTeamSchema } from "@/features/team";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsed = joinTeamSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsed.error));
  }

  try {
    const team = await joinTeamByCode({
      userId: auth.user.id,
      teamCode: parsed.data.code,
    });

    return successResponse({ team }, "Joined team successfully.");
  } catch (error) {
    if (isTeamServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to join team.", 500);
  }
}
