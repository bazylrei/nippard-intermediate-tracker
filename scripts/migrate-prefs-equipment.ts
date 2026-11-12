/**
 * Run once to add body_weight_kg / height_cm to user_preferences
 * and equipment to exercises.
 *
 * Usage: npx tsx scripts/migrate-prefs-equipment.ts
 * Reads SUPABASE_SERVICE_ROLE_KEY from .env.local automatically.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually (tsx doesn't auto-load it)
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?/);
    if (match) process.env[match[1]] ??= match[2];
  }
} catch { /* no .env.local — that's fine */ }

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
  `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS body_weight_kg FLOAT`,
  `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS height_cm FLOAT`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment TEXT`,
];

const EQUIPMENT_MAP: { pattern: RegExp; equipment: string }[] = [
  { pattern: /\bDB\b|\bDumbbell\b/i,                                              equipment: "dumbbell" },
  { pattern: /Pull-?Up|Chin-?Up|\bDip\b|Push-?Up|Hanging|Roman Chair|Nordic Ham/i, equipment: "bodyweight" },
  { pattern: /\bBarbell\b|\bEZ.?Bar\b/i,                                           equipment: "barbell" },
  { pattern: /\bCable\b|Lat Pulldown|Face Pull|Bayesian/i,                          equipment: "cable" },
];

async function main() {
  // ── 1. DDL via Management API ──────────────────────────────────────────────
  const ref = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
  let ddlOk = false;
  if (ref) {
    console.log("Running schema migration via Management API...");
    for (const sql of DDL) {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        console.log(`  DDL failed (${res.status}): ${JSON.stringify(json)}`);
      } else {
        console.log(`  OK: ${sql.substring(0, 70)}`);
        ddlOk = true;
      }
    }
  }

  if (!ddlOk) {
    console.log("\n⚠️  Could not run DDL automatically. Run this SQL once in the Supabase SQL editor:");
    console.log("  https://supabase.com/dashboard/project/avlybhdtpgnynjffgofv/sql/new\n");
    for (const sql of DDL) console.log(`  ${sql};`);
    console.log("\nThen re-run this script to populate equipment values.\n");
  }

  // ── 2. Populate equipment on exercises ────────────────────────────────────
  console.log("Fetching exercises...");
  const { data: exercises, error } = await sb.from("exercises").select("id, name");
  if (error) { console.error("Failed to fetch exercises:", error.message); return; }
  if (!exercises?.length) { console.log("No exercises found."); return; }

  const updates: { id: string; equipment: string }[] = [];
  for (const ex of exercises as { id: string; name: string }[]) {
    for (const { pattern, equipment } of EQUIPMENT_MAP) {
      if (pattern.test(ex.name)) { updates.push({ id: ex.id, equipment }); break; }
    }
  }

  console.log(`Updating ${updates.length} exercises with equipment type...`);
  let ok = 0, fail = 0;
  for (const u of updates) {
    const { error: uErr } = await sb.from("exercises").update({ equipment: u.equipment }).eq("id", u.id);
    if (uErr) { console.log(`  FAILED ${u.id}: ${uErr.message}`); fail++; }
    else ok++;
  }
  console.log(`\nDone. ${ok} updated, ${fail} failed.`);
  if (fail > 0) console.log("Run the DDL above first, then re-run this script.");
}

main().catch(console.error);
