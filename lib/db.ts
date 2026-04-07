import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }

  if (!global.__pgPool__) {
    global.__pgPool__ = new Pool({ connectionString });
  }

  return global.__pgPool__;
}

export async function query(text: string, params?: any[]) {
  return getPool().query(text, params);
}

export default getPool;