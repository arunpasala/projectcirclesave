import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in .env.local");
}

const pool =
  (globalThis as any).__pgPool ||
  new Pool({
    connectionString,
  });

// Prevent hot-reload creating new pools
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__pgPool = pool;
}

export default pool;