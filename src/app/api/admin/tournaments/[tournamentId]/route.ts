import {
  isTournamentServiceError,
  tournamentParamsSchema,
  updateTournamentByAdmin,
  updateTournamentSchema,
} from "@/features/tournament";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
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

  const parsedBody = updateTournamentSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const result = await updateTournamentByAdmin({
      tournamentId: parsedParams.data.tournamentId,
      title: parsedBody.data.title,
      startDate: parsedBody.data.startDate,
      endDate: parsedBody.data.endDate,
      headliner: parsedBody.data.headliner,
      teamLimit: parsedBody.data.teamLimit,
      matchBestOf: parsedBody.data.matchBestOf,
      finalBestOf: parsedBody.data.finalBestOf,
    });

    return successResponse({ result }, "Tournament updated successfully.");
  } catch (error) {
    if (isTournamentServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to update tournament.", 500);
  }
}
