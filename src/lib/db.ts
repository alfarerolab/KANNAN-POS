import { PrismaClient } from "@prisma/client";

const createPrismaClient = () => {
  return new PrismaClient();
};

declare global {
  // @ts-expect-error Autofix Next15 o tipos implícitos
  var prisma: PrismaClient | undefined;
}

// @ts-expect-error Autofix Next15 o tipos implícitos
export const db = globalThis.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  // @ts-expect-error Autofix Next15 o tipos implícitos
  globalThis.prisma = db;
}
