import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function connectDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("✅ PostgreSQL 연결 성공 (pg)");
  } finally {
    client.release();
  }
}

export async function disconnectDatabase(): Promise<void> {
  await pool.end();
  console.log("🔌 pg Pool 연결 해제");
}
