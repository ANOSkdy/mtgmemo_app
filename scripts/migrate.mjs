import { loadEnvConfig } from '@next/env';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) {
  console.error('Missing DATABASE_URL or NEON_DATABASE_URL.');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

const migrationsDir = path.join(process.cwd(), 'migrations');

async function ensureMigrationsTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => String(row.filename)));
}

async function runMigration(filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = await readFile(filePath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  await client.connect();

  try {
    await ensureMigrationsTable();

    const allFiles = await readdir(migrationsDir);
    const migrationFiles = allFiles.filter((name) => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b));

    const applied = await getAppliedMigrations();

    for (const filename of migrationFiles) {
      if (applied.has(filename)) {
        console.log(`Skipping already applied migration: ${filename}`);
        continue;
      }

      await runMigration(filename);
    }

    console.log('Migration run complete.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
