import {
  isTournamentServiceError,
  seedPaidTeamsForTournament,
  seedTournamentSchema,
  tournamentParamsSchema,
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
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = tournamentParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  let body: unknown = {};
  try {
    const rawBody = await request.text();
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsedBody = seedTournamentSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const result = await seedPaidTeamsForTournament({
      tournamentId: parsedParams.data.tournamentId,
      shuffle: parsedBody.data.shuffle,
    });

    return successResponse({ result }, "Tournament seeded successfully.");
  } catch (error) {
    if (isTournamentServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to seed tournament.", 500);
  }
}
