import {
  createTournamentByAdmin,
  createTournamentSchema,
  isTournamentServiceError,
} from "@/features/tournament";
import {
  errorResponse,
  formatZodErrors,
  successResponse,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsed.error));
  }

  try {
    const tournament = await createTournamentByAdmin({
      adminUserId: auth.user.id,
      title: parsed.data.title,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      headliner: parsed.data.headliner,
      teamLimit: parsed.data.teamLimit,
      matchBestOf: parsed.data.matchBestOf,
      finalBestOf: parsed.data.finalBestOf,
    });

    return successResponse({ tournament }, "Tournament created successfully.", 201);
  } catch (error) {
    if (isTournamentServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to create tournament.", 500);
  }
}
