import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool } from "pg";

// migrate applies every .sql file in dir that is not yet recorded in schema_migrations,
// in name order. Each file and its record are committed in one transaction.
export async function migrate(pool: Pool, dir: string): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name       text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  const done = new Set(rows.map((r) => r.name));

  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;

    const sql = await readFile(join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      applied.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`migration ${file} failed`, { cause: error });
    } finally {
      client.release();
    }
  }
  return applied;
}