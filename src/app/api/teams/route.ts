import { createTeamForUser, createTeamSchema, isTeamServiceError } from "@/features/team";
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

  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsed.error));
  }

  try {
    const team = await createTeamForUser({
      userId: auth.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
    });

    return successResponse({ team }, "Team created successfully.", 201);
  } catch (error) {
    if (isTeamServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to create team.", 500);
  }
}
