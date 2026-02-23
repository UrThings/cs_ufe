import { Prisma, PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/environment";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaAdapter: PrismaPg | undefined;
}

const poolMax = Number(process.env.PG_POOL_MAX ?? (env.NODE_ENV === "production" ? "5" : "1"));
const poolConfig = {
  connectionString: env.DATABASE_URL,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 1,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
};

const adapter =
  globalThis.prismaAdapter ??
  new PrismaPg(poolConfig, {
    onPoolError: (error) => {
      console.error("Prisma PG pool error:", error);
    },
  });
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
  globalThis.prismaAdapter = adapter;
  globalThis.prisma = prismaClient;
}

export const prisma = prismaClient;
