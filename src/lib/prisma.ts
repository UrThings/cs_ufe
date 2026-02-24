import { Prisma, PrismaClient } from "@/generated/prisma";

declare global {
  var prisma: PrismaClient | undefined;
}

const logOptions: Prisma.PrismaClientOptions["log"] =
  process.env.NODE_ENV === "production"
    ? ["error"]
    : ["query", "info", "warn", "error"];

const prismaClient =
  globalThis.prisma ??
  new PrismaClient({
    log: logOptions,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prismaClient;
}

export const prisma = prismaClient;
