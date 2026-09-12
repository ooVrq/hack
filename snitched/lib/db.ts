import { Pool } from "pg";

// One pool per server instance, cached across hot reloads in dev.
//
// max:2 is deliberate. Every warm Vercel serverless instance holds its own
// pool, and a free Tiger Cloud service has no connection pooler in front of
// it — a generous per-instance pool multiplied by concurrent lambdas will
// exhaust max_connections. Keep the cron tick's batch small for the same reason.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

/** Run a query and get the rows back. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Run a set of statements in one transaction on a single connection. */
export async function transaction<T>(fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
