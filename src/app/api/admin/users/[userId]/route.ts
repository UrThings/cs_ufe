import {
  adminUpdateUserSchema,
  adminUserParamsSchema,
  deleteUserByAdmin,
  isAdminManagementError,
  updateUserByAdmin,
} from "@/features/admin";
import { errorResponse, formatZodErrors, successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = adminUserParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const parsedBody = adminUpdateUserSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedBody.error));
  }

  try {
    const user = await updateUserByAdmin({
      userId: parsedParams.data.userId,
      name: parsedBody.data.name,
      email: parsedBody.data.email,
      role: parsedBody.data.role,
    });

    return successResponse({ user }, "User updated successfully.");
  } catch (error) {
    if (isAdminManagementError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to update user.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = adminUserParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse("Validation failed.", 400, formatZodErrors(parsedParams.error));
  }

  try {
    const result = await deleteUserByAdmin({
      userId: parsedParams.data.userId,
      actingAdminId: auth.user.id,
    });

    return successResponse({ result }, "User deleted successfully.");
  } catch (error) {
    if (isAdminManagementError(error)) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Unable to delete user.", 500);
  }
}
