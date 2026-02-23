import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { ApiError, ApiFieldErrors, ApiSuccess } from "@/types";

export function formatZodErrors(error: ZodError): ApiFieldErrors {
  return error.issues.reduce<ApiFieldErrors>((acc, issue) => {
    const key = issue.path.join(".") || "root";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(issue.message);
    return acc;
  }, {});
}

export function successResponse<T>(
  data: T,
  message = "Request successful.",
  status = 200,
) {
  const body: ApiSuccess<T> = {
    success: true,
    message,
    data,
  };

  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  errors?: ApiError["errors"],
) {
  const body: ApiError = {
    success: false,
    message,
    errors,
  };

  return NextResponse.json(body, { status });
}
