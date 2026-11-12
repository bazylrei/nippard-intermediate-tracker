import { createClient } from "@supabase/supabase-js";
import { PROGRAM } from "./program-data-static";

const SUPABASE_URL = "https://avlybhdtpgnynjffgofv.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PROGRAM_ID = "00000000-0000-0000-0000-000000000001";

const WARMUP_PROTOCOL_STEPS: Record<string, string[]> = {
  none: [],
  "1-set": ["~60% × 6–10 reps"],
  "2-set": ["~50% × 6–10 reps", "~70% × 4–6 reps"],
  "3-set": ["~45% × 6–10 reps", "~65% × 4–6 reps", "~85% × 3–4 reps"],
  "4-set": [
    "~45% × 6–10 reps",
    "~60% × 4–6 reps",
    "~75% × 3–5 reps",
    "~85% × 2–4 reps",
  ],
};

async function main() {
  // ── 1. Upsert warmup protocols ─────────────────────────────────────────────
  console.log("Upserting warmup protocols...");
  const warmupRows = Object.entries(WARMUP_PROTOCOL_STEPS).map(([id, steps]) => ({ id, steps }));
  const { error: wpErr } = await sb
    .from("warmup_protocols")
    .upsert(warmupRows, { onConflict: "id" });
  if (wpErr) throw new Error(`warmup_protocols upsert failed: ${wpErr.message}`);
  console.log(`  ${warmupRows.length} protocols upserted`);

  // ── 2. Extract unique exercises ────────────────────────────────────────────
  console.log("Collecting unique exercises...");
  const seenExIds = new Set<string>();
  const exerciseRows: {
    id: string;
    name: string;
    muscle_group: string;
    alternate_1: string | null;
    alternate_2: string | null;
    rest_min: number;
    rest_max: number;
    warmup_protocol: string;
    form_note: string | null;
  }[] = [];

  for (const week of PROGRAM) {
    for (const day of week.days) {
      for (const ex of day.exercises) {
        if (seenExIds.has(ex.id)) continue;
        seenExIds.add(ex.id);
        exerciseRows.push({
          id: ex.id,
          name: ex.name,
          muscle_group: ex.muscleGroup,
          alternate_1: ex.alternates[0] ?? null,
          alternate_2: ex.alternates[1] ?? null,
          rest_min: ex.restSeconds[0],
          rest_max: ex.restSeconds[1],
          warmup_protocol: ex.warmupProtocol,
          form_note: ex.formNote || null,
        });
      }
    }
  }

  console.log("Upserting exercises...");
  const { error: exErr } = await sb
    .from("exercises")
    .upsert(exerciseRows, { onConflict: "id" });
  if (exErr) throw new Error(`exercises upsert failed: ${exErr.message}`);
  console.log(`  ${exerciseRows.length} exercises upserted`);

  // ── 3. Upsert program ──────────────────────────────────────────────────────
  console.log("Upserting program...");
  const { error: progErr } = await sb.from("programs").upsert(
    {
      id: PROGRAM_ID,
      name: "Nippard Intermediate",
      is_public: true,
      total_weeks: 12,
    },
    { onConflict: "id" }
  );
  if (progErr) throw new Error(`programs upsert failed: ${progErr.message}`);
  console.log("  Program upserted");

  // ── 4. Upsert program_days and insert program_day_exercises ───────────────
  console.log("Processing program days...");
  for (const week of PROGRAM) {
    for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
      const day = week.days[dayIndex];

      // Upsert the day row
      const { data: dayData, error: dayErr } = await sb
        .from("program_days")
        .upsert(
          {
            program_id: PROGRAM_ID,
            week: week.week,
            day_index: dayIndex,
            day_type: day.dayType,
          },
          { onConflict: "program_id,week,day_index" }
        )
        .select("id")
        .single();

      if (dayErr || !dayData) {
        throw new Error(
          `program_days upsert failed for week ${week.week} day ${dayIndex}: ${dayErr?.message}`
        );
      }

      const dayId = dayData.id;

      // Delete existing exercises for this day
      const { error: delErr } = await sb
        .from("program_day_exercises")
        .delete()
        .eq("program_day_id", dayId);
      if (delErr) throw new Error(`delete program_day_exercises failed: ${delErr.message}`);

      // Insert all exercises for this day
      const exerciseInserts = day.exercises.map((ex, position) => ({
        program_day_id: dayId,
        exercise_id: ex.id,
        position,
        rep_range_min: ex.repRange[0],
        rep_range_max: ex.repRange[1],
        early_set_count: ex.earlySetCount,
        last_set_count: ex.lastSetCount,
        early_set_rpe_min: ex.earlySetRpe[0],
        early_set_rpe_max: ex.earlySetRpe[1],
        last_set_rpe_min: ex.lastSetRpe?.[0] ?? null,
        last_set_rpe_max: ex.lastSetRpe?.[1] ?? null,
        last_set_target: ex.lastSetTarget,
      }));

      const { error: insErr } = await sb
        .from("program_day_exercises")
        .insert(exerciseInserts);
      if (insErr) {
        throw new Error(
          `program_day_exercises insert failed for week ${week.week} day ${dayIndex}: ${insErr.message}`
        );
      }
    }
    console.log(`  Week ${week.week} seeded`);
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
