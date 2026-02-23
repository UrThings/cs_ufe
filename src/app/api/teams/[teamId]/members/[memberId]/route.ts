import {
  isTeamServiceError,
  removeTeamMember,
  teamMemberParamsSchema,
} from "@/features/team";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    teamId: string;
    memberId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = teamMemberParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  try {
    const result = await removeTeamMember({
      captainUserId: auth.user.id,
      teamId: parsedParams.data.teamId,
      memberId: parsedParams.data.memberId,
    });

    return successResponse({ result }, "Team member removed successfully.");
  } catch (error) {
    if (isTeamServiceError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to remove team member.", 500);
  }
}
