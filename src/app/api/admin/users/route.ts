import { prisma } from "@/lib/prisma";
import { successResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  const auth = await requireAdmin();

  if (auth.response) {
    return auth.response;
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return successResponse({ users }, "Admin users fetched.");
}
