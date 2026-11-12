/**
 * Adds is_bodyweight and weight_per_side boolean columns to exercises table,
 * then populates them from the existing equipment column values.
 *
 * Usage: npx tsx scripts/migrate-boolean-flags.ts
 * Reads SUPABASE_SERVICE_ROLE_KEY from .env.local automatically.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

try {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?/);
    if (match) process.env[match[1]] ??= match[2];
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://avlybhdtpgnynjffgofv.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DDL = [
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_bodyweight BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS weight_per_side BOOLEAN NOT NULL DEFAULT FALSE`,
];

async function runDdl(): Promise<boolean> {
  const ref = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
  if (!ref) return false;

  console.log("Running DDL via Management API...");
  let anyOk = false;
  for (const sql of DDL) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      console.log(`  DDL status ${res.status}: ${JSON.stringify(json)} — may already exist, continuing`);
    } else {
      console.log(`  OK: ${sql.substring(0, 80)}`);
      anyOk = true;
    }
  }
  return anyOk;
}

async function main() {
  await runDdl();

  // Verify columns exist by attempting a select
  const { error: checkErr } = await sb
    .from("exercises")
    .select("id, is_bodyweight, weight_per_side")
    .limit(1);

  if (checkErr) {
    console.error("\nColumns not accessible yet:", checkErr.message);
    console.log("\nRun this SQL manually in the Supabase SQL editor:");
    console.log("  https://supabase.com/dashboard/project/avlybhdtpgnynjffgofv/sql/new\n");
    for (const sql of DDL) console.log(`  ${sql};`);
    return;
  }

  console.log("Columns confirmed. Fetching exercises with equipment data...");

  // Fetch all exercises with the old equipment column
  const { data: exercises, error } = await sb
    .from("exercises")
    .select("id, name, equipment");

  if (error) { console.error("Failed to fetch exercises:", error.message); return; }
  if (!exercises?.length) { console.log("No exercises found."); return; }

  type ExRow = { id: string; name: string; equipment: string | null };
  const rows = exercises as ExRow[];

  const updates: { id: string; is_bodyweight: boolean; weight_per_side: boolean }[] = [];
  for (const ex of rows) {
    const eq = ex.equipment ?? "";
    updates.push({
      id: ex.id,
      is_bodyweight: eq === "bodyweight",
      weight_per_side: eq === "dumbbell" || eq === "cable",
    });
  }

  console.log(`Updating ${updates.length} exercises...`);
  let ok = 0, fail = 0;
  for (const u of updates) {
    const { error: uErr } = await sb
      .from("exercises")
      .update({ is_bodyweight: u.is_bodyweight, weight_per_side: u.weight_per_side })
      .eq("id", u.id);
    if (uErr) { console.log(`  FAILED ${u.id}: ${uErr.message}`); fail++; }
    else ok++;
  }

  console.log(`\nDone. ${ok} updated, ${fail} failed.`);

  // Print summary
  const bw = updates.filter((u) => u.is_bodyweight).length;
  const wps = updates.filter((u) => u.weight_per_side).length;
  console.log(`  is_bodyweight=true: ${bw} exercises`);
  console.log(`  weight_per_side=true: ${wps} exercises`);
}

main().catch(console.error);
