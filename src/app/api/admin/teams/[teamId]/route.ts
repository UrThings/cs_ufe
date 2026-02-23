import {
  adminTeamParamsSchema,
  adminUpdateTeamSchema,
  deleteTeamByAdmin,
  isAdminManagementError,
  updateTeamByAdmin,
} from "@/features/admin";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    teamId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = adminTeamParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsedBody = adminUpdateTeamSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const team = await updateTeamByAdmin({
      teamId: parsedParams.data.teamId,
      name: parsedBody.data.name,
      description: parsedBody.data.description,
      isPaid: parsedBody.data.isPaid,
    });

    return successResponse({ team }, "Team updated successfully.");
  } catch (error) {
    if (isAdminManagementError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to update team.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = adminTeamParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  try {
    const result = await deleteTeamByAdmin({
      teamId: parsedParams.data.teamId,
    });

    return successResponse({ result }, "Team deleted successfully.");
  } catch (error) {
    if (isAdminManagementError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to delete team.", 500);
  }
}
