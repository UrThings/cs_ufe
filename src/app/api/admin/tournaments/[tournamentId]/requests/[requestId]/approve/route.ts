import {
  approveTournamentJoinRequest,
  isTournamentServiceError,
  tournamentRequestParamsSchema,
} from "@/features/tournament";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    tournamentId: string;
    requestId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = tournamentRequestParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  try {
    const result = await approveTournamentJoinRequest({
      adminUserId: auth.user.id,
      tournamentId: parsedParams.data.tournamentId,
      requestId: parsedParams.data.requestId,
    });

    return successResponse({ result }, "Join request approved.");
  } catch (error) {
    if (isTournamentServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to approve join request.", 500);
  }
}
