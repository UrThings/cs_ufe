import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/environment";

declare global {
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const logOptions: Prisma.PrismaClientOptions["log"] =
  process.env.NODE_ENV === "production"
    ? ["error"]
    : ["query", "info", "warn", "error"];

const prismaClient =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: logOptions,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prismaClient;
}

export const prisma = prismaClient;
