import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth/guards";
import {
  isTeamServiceError,
  teamParamsSchema,
  updateTeamDetails,
  updateTeamSchema,
} from "@/features/team";

type RouteContext = {
  params: Promise<{
    teamId: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = teamParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  let body: unknown;
  try {
    body = await _request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsedBody = updateTeamSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const team = await updateTeamDetails({
      captainUserId: auth.user.id,
      teamId: parsedParams.data.teamId,
      name: parsedBody.data.name?.trim(),
      description: parsedBody.data.description ?? null,
    });

    return successResponse({ team }, "Team updated successfully.");
  } catch (error) {
    if (isTeamServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to update team.", 500);
  }
}
