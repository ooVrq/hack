// Applies db/*.sql in filename order, once each, tracked in a _migrations table.
// Run with: npm run db:migrate
//
// A file whose first line is `-- migrate:no-transaction` runs outside a
// transaction — TimescaleDB requires that for continuous aggregates.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const DB_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db");
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set. Is it in snitched/.env.local?");
  process.exit(1);
}
if (url.includes("SERVICE_ID") || url.includes("PASSWORD@")) {
  console.error(
    "DATABASE_URL is still the placeholder from .env.example.\n" +
      "Paste the real connection string from the TigerData console into snitched/.env.local.",
  );
  process.exit(1);
}

// rejectUnauthorized:false skips TLS certificate verification. Fine for a
// hackathon database holding test data; tighten it if this ever holds anything real.
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
} catch (err) {
  console.error(`Could not connect: ${err.message}`);
  process.exit(1);
}

const { rows: ext } = await client.query(
  "select extversion from pg_extension where extname = 'timescaledb'",
);
console.log(
  ext.length
    ? `connected — timescaledb ${ext[0].extversion}`
    : "connected — WARNING: timescaledb extension not found, 002 will fail",
);

await client.query(`
  create table if not exists _migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows: done } = await client.query("select name from _migrations");
const applied = new Set(done.map((r) => r.name));
const files = fs.readdirSync(DB_DIR).filter((f) => f.endsWith(".sql")).sort();

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip   ${file}`);
    continue;
  }

  const body = fs.readFileSync(path.join(DB_DIR, file), "utf8");
  const noTx = /^--\s*migrate:no-transaction/.test(body);
  process.stdout.write(`  apply  ${file}${noTx ? "  (no transaction)" : ""} ... `);

  try {
    if (!noTx) await client.query("begin");
    await client.query(body);
    await client.query("insert into _migrations (name) values ($1)", [file]);
    if (!noTx) await client.query("commit");
    console.log("ok");
    ran++;
  } catch (err) {
    if (!noTx) await client.query("rollback").catch(() => {});
    console.log("FAILED");
    console.error(`\n${err.message}\n`);
    if (noTx) {
      console.error(
        "This file runs outside a transaction, so earlier statements in it may " +
          "have applied. Check the database before re-running.\n",
      );
    }
    await client.end();
    process.exit(1);
  }
}

console.log(ran ? `\n${ran} migration(s) applied.` : "\nAlready up to date.");
await client.end();
