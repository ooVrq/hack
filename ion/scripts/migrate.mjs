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

// Postgres runs a multi-statement query string as one implicit transaction, so
// a `no-transaction` file has to be sent one statement at a time — skipping the
// explicit `begin` is not enough. Splitting has to respect quotes, dollar-quoted
// bodies and comments so a semicolon inside one never ends a statement.
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let i = 0;

  while (i < sql.length) {
    const rest = sql.slice(i);
    const ch = sql[i];
    let end = -1;

    if (rest.startsWith("--")) {
      const nl = sql.indexOf("\n", i);
      end = nl === -1 ? sql.length : nl;
    } else if (rest.startsWith("/*")) {
      const close = sql.indexOf("*/", i + 2);
      end = close === -1 ? sql.length : close + 2;
    } else if (/^\$(?:[A-Za-z_]\w*)?\$/.test(rest)) {
      const tag = /^\$(?:[A-Za-z_]\w*)?\$/.exec(rest)[0];
      const close = sql.indexOf(tag, i + tag.length);
      end = close === -1 ? sql.length : close + tag.length;
    } else if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) j += 2;
          else {
            j++;
            break;
          }
        } else j++;
      }
      end = j;
    } else if (ch === ";") {
      statements.push(current);
      current = "";
      i++;
      continue;
    }

    if (end === -1) {
      current += ch;
      i++;
    } else {
      current += sql.slice(i, end);
      i = end;
    }
  }
  statements.push(current);

  const hasSql = (s) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "").trim() !== "";
  return statements.map((s) => s.trim()).filter(hasSql);
}

if (!url) {
  console.error("DATABASE_URL is not set. Is it in ion/.env.local?");
  process.exit(1);
}
if (url.includes("SERVICE_ID") || url.includes("PASSWORD@")) {
  console.error(
    "DATABASE_URL is still the placeholder from .env.example.\n" +
      "Paste the real connection string from the TigerData console into ion/.env.local.",
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
    if (noTx) {
      for (const statement of splitStatements(body)) await client.query(statement);
    } else {
      await client.query("begin");
      await client.query(body);
    }
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
