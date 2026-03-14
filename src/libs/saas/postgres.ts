import { Pool, type PoolClient } from "pg";

declare global {
  var __saasPgPool: Pool | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL for SaaS billing.");
  }
  return databaseUrl;
}

export function getSaaSPgPool() {
  if (global.__saasPgPool) {
    return global.__saasPgPool;
  }

  global.__saasPgPool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  return global.__saasPgPool;
}

export async function withPgTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getSaaSPgPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
