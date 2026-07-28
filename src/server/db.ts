/**
 * Prisma client singleton.
 *
 * Cached on `globalThis` so Next.js hot-reload (and serverless warm starts)
 * reuse one connection pool instead of exhausting the database with new
 * clients on every module evaluation.
 */

import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
