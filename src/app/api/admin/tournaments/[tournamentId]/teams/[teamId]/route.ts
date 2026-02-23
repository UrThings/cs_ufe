import {
  isTournamentServiceError,
  removeTeamFromTournamentByAdmin,
  tournamentTeamParamsSchema,
} from "@/features/tournament";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    tournamentId: string;
    teamId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = tournamentTeamParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  try {
    const result = await removeTeamFromTournamentByAdmin({
      adminUserId: auth.user.id,
      tournamentId: parsedParams.data.tournamentId,
      teamId: parsedParams.data.teamId,
    });

    return successResponse({ result }, "Team removed from tournament.");
  } catch (error) {
    if (isTournamentServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to remove team from tournament.", 500);
  }
}
