import {
  isTournamentServiceError,
  pickMatchWinnerAndAdvance,
  matchParamsSchema,
  pickWinnerSchema,
} from "@/features/tournament";
import {
  errorResponse,
  formatZodErrors,
  successResponse,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    tournamentId: string;
    matchId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = matchParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsedBody = pickWinnerSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const result = await pickMatchWinnerAndAdvance({
      tournamentId: parsedParams.data.tournamentId,
      matchId: parsedParams.data.matchId,
      winnerTeamId: parsedBody.data.winnerTeamId,
      homeScore: parsedBody.data.homeScore,
      awayScore: parsedBody.data.awayScore,
    });

    return successResponse({ result }, "Match winner recorded.");
  } catch (error) {
    if (isTournamentServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to record match winner.", 500);
  }
}
