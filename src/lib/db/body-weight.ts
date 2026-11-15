import { createClient } from "../supabase";
import type { BodyWeightLog } from "../types";
import { unwrap } from "./result";

function mapLog(row: { logged_on: string; weight_kg: number; source: string }): BodyWeightLog {
  return { loggedOn: row.logged_on, weightKg: row.weight_kg, source: row.source as BodyWeightLog["source"] };
}

/** The most recent weigh-in, or null before the first one. */
export async function getLatestBodyWeight(userId: string): Promise<BodyWeightLog | null> {
  const sb = createClient();
  const row = unwrap("getLatestBodyWeight", await sb
    .from("body_weight_logs")
    .select("logged_on, weight_kg, source")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    .limit(1)
    .maybeSingle());
  return row ? mapLog(row) : null;
}

/** Every weigh-in, oldest first (one per day, so a few hundred rows at most). */
export async function getBodyWeightLogs(userId: string): Promise<BodyWeightLog[]> {
  const sb = createClient();
  const rows = unwrap("getBodyWeightLogs", await sb
    .from("body_weight_logs")
    .select("logged_on, weight_kg, source")
    .eq("user_id", userId)
    .order("logged_on"));
  return (rows ?? []).map(mapLog);
}

/** Records a manual weigh-in for a day; logging the same day again replaces it (safe to retry). */
export async function logBodyWeight(userId: string, loggedOn: string, weightKg: number): Promise<void> {
  const sb = createClient();
  unwrap("logBodyWeight", await sb.from("body_weight_logs").upsert(
    { user_id: userId, logged_on: loggedOn, weight_kg: weightKg, source: "manual" },
    { onConflict: "user_id,logged_on" },
  ));
}
