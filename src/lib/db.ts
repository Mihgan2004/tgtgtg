import 'server-only';
import { Pool, type QueryResultRow } from "pg";

function mustGet(name: string): string {
  const v = process.env[name];
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`ENV ${name} is required`);
  }
  return v;
}

export const pool = new Pool({
  connectionString: mustGet("DATABASE_URL"),
  max: 10,
  idleTimeoutMillis: 15_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.PGSSL === "1" ? { rejectUnauthorized: false } : undefined,
});

export async function q<T extends QueryResultRow>(sql: string, params?: any[]): Promise<T[]> {
  const c = await pool.connect();
  try {
    const r = await c.query<T>(sql, params);
    return r.rows as T[];
  } finally {
    c.release();
  }
}
