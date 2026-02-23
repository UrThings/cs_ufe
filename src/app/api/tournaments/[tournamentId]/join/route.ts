import {
  isTournamentServiceError,
  joinTournament,
  joinTournamentSchema,
  tournamentParamsSchema,
} from "@/features/tournament";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = tournamentParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsedBody = joinTournamentSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const result = await joinTournament({
      userId: auth.user.id,
      tournamentId: parsedParams.data.tournamentId,
      teamId: parsedBody.data.teamId,
    });

    return successResponse({ result }, "Join request submitted. Waiting for admin approval.");
  } catch (error) {
    if (isTournamentServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to join tournament.", 500);
  }
}
