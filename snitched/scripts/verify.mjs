// Prints what actually exists in the database. Run with: npm run db:verify
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url || url.includes("SERVICE_ID")) {
  console.error("DATABASE_URL missing or still the placeholder in snitched/.env.local");
  process.exit(1);
}

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const show = async (label, sql, empty) => {
  const { rows } = await c.query(sql);
  console.log(`\n${label}`);
  if (!rows.length) return console.log(`  (none) ${empty ?? ""}`);
  for (const r of rows) console.log("  " + Object.values(r).join("  ·  "));
};

const { rows: v } = await c.query("select extversion from pg_extension where extname='timescaledb'");
console.log(`timescaledb: ${v.length ? v[0].extversion : "NOT INSTALLED"}`);

await show("migrations applied", "select name from _migrations order by name");
await show("tables",
  "select tablename from pg_tables where schemaname='public' order by tablename");
await show("hypertables",
  "select hypertable_name, num_chunks from timescaledb_information.hypertables",
  "— expected: checks");
await show("continuous aggregates",
  "select view_name from timescaledb_information.continuous_aggregates",
  "— expected: checks_hourly");
await show("background jobs",
  `select proc_name, coalesce(hypertable_name,'-') as target, schedule_interval::text
   from timescaledb_information.jobs where job_id > 1000 order by job_id`,
  "— expected: refresh + retention policies");

await c.end();
