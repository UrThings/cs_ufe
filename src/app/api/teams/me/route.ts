import { getTeamForUser, isTeamServiceError, leaveTeamForUser } from "@/features/team";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth/guards";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) {
    return auth.response;
  }

  try {
    const team = await getTeamForUser(auth.user.id);
    return successResponse({ team }, "Team data retrieved successfully.");
  } catch (error) {
    if (isTeamServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to fetch team.", 500);
  }
}

export async function DELETE() {
  const auth = await requireUser();
  if (auth.response) {
    return auth.response;
  }

  try {
    const result = await leaveTeamForUser(auth.user.id);
    return successResponse({ result }, "You have left the team.");
  } catch (error) {
    if (isTeamServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to leave team.", 500);
  }
}
