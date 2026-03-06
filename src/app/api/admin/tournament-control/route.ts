import {
  isTournamentControlError,
  setTournamentEnabledFlag,
  getTournamentEnabledFlag,
} from "@/features/tournament";
import { adminTournamentControlSchema } from "@/features/admin";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  try {
    const enabled = await getTournamentEnabledFlag();
    return successResponse({ enabled }, "Tournament access control fetched.");
  } catch (error) {
    if (isTournamentControlError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to fetch tournament access control.", 500);
  }
}

export async function PATCH(request: Request) {
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

  const parsedBody = adminTournamentControlSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const result = await setTournamentEnabledFlag(parsedBody.data.enabled);
    return successResponse({ result }, "Tournament access control updated.");
  } catch (error) {
    if (isTournamentControlError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to update tournament access control.", 500);
  }
}
