import { isTeamServiceError, markTeamAsPaid, teamParamsSchema } from "@/features/team";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    teamId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = teamParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  try {
    const team = await markTeamAsPaid(parsedParams.data.teamId);
    return successResponse({ team }, "Team marked as paid.");
  } catch (error) {
    if (isTeamServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to mark team as paid.", 500);
  }
}
