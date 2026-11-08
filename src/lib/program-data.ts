import type { Exercise, WorkoutDay, WeekSchedule, WarmupProtocol } from "./types";

// ─── Exercise catalogue ────────────────────────────────────────────────────────
// Exercises are defined once; sets/reps/RPE targets are per-week overlays.
// The catalogue only carries properties that never change across weeks.

function ex(
  id: string,
  name: string,
  alternateName: string,
  muscleGroup: Exercise["muscleGroup"],
  restSeconds: [number, number],
  warmupProtocol: WarmupProtocol,
  repRange: [number, number],
  earlySetRpe: [number, number],
  lastSetTarget: Exercise["lastSetTarget"],
  earlySetCount: number,
  lastSetCount: number,
  formNote: string,
  lastSetRpe?: [number, number]
): Exercise {
  return {
    id,
    name,
    alternateName,
    muscleGroup,
    restSeconds,
    warmupProtocol,
    repRange,
    earlySetRpe,
    lastSetTarget,
    lastSetRpe,
    earlySetCount,
    lastSetCount,
    formNote,
  };
}

// ─── Block 1 exercises (Weeks 1–5) ────────────────────────────────────────────

// Day A – Upper A (Push/Pull)
const b1_inclineMachinePress = (early: number, last: number): Exercise =>
  ex("b1-incline-machine-press", "45° Incline Machine Press", "45° Incline DB Press",
    "chest", [180, 300], "3-set", [6, 8], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "1 second pause at the bottom of each rep while maintaining tension on the pecs.",
    early === 0 ? [7, 8] : undefined);

const b1_bottomHalfFlyeA = (early: number, last: number): Exercise =>
  ex("b1-bottom-half-flye", "Bottom-Half DB Flye", "Pec Deck",
    "chest", [60, 120], "none", [8, 10], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Only lower the DBs halfway down — focus on peak contraction at the top.",
    early === 0 ? [8, 9] : undefined);

const b1_dualHandleLatPulldown = (early: number, last: number): Exercise =>
  ex("b1-dual-handle-lat-pulldown", "Dual-Handle Lat Pulldown", "Wide-Grip Lat Pulldown",
    "back", [120, 180], "2-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Pull the handle more out in front of you, like a cross between a pullover and a pulldown. Focus on feeling your lats.",
    early === 0 ? [7, 8] : undefined);

const b1_leanInLateralRaise = (early: number, last: number): Exercise =>
  ex("b1-lean-in-lateral-raise", "Lean-In DB Lateral Raise", "High-Cable Lateral Raise",
    "shoulders", [60, 120], "none", [8, 10], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Lean into a rack or cable at an angle to pre-stretch the delt. Lead with the elbow.",
    early === 0 ? [8, 9] : undefined);

const b1_singleArmDbRow = (early: number, last: number): Exercise =>
  ex("b1-single-arm-db-row", "Single-Arm DB Row", "Smith Machine Row",
    "back", [120, 180], "1-set", [6, 8], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Drive elbow behind your hip. Full ROM — let shoulder blade protract at bottom.",
    early === 0 ? [8, 9] : undefined);

const b1_dbSkullCrusher = (early: number, last: number): Exercise =>
  ex("b1-db-skull-crusher", "DB Skull Crusher", "Overhead Cable Triceps Extension (Bar)",
    "triceps", [60, 120], "none", [8, 10], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Lower DBs to sides of head, not forehead. Keep elbows pointing straight up.",
    early === 0 ? [8, 9] : undefined);

const b1_inclineDbStretchCurl = (early: number, last: number): Exercise =>
  ex("b1-incline-db-stretch-curl", "Incline DB Stretch Curl", "Bayesian Cable Curl",
    "biceps", [60, 120], "none", [8, 10], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Lie back on 45–60° incline. Let arms hang fully behind torso for maximum stretch.",
    early === 0 ? [8, 9] : undefined);

// Day B – Lower A
const b1_nordicHamCurl = (early: number, last: number): Exercise =>
  ex("b1-nordic-ham-curl", "Nordic Ham Curl", "Lying Leg Curl",
    "hamstrings", [60, 120], "2-set", [8, 10], [7, 8],
    early === 0 ? "rpe" : "failure+llps",
    early, last,
    "Set machine for maximum stretch. Prevent your butt from popping up as you curl.",
    early === 0 ? [8, 9] : undefined);

const b1_highBarBackSquat = (early: number, last: number): Exercise =>
  ex("b1-high-bar-back-squat", "High-Bar Back Squat", "Smith Machine Squat",
    "quads", [180, 300], "4-set", [6, 8], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Set feet 3–6 inches forward under the bar. Upright torso, more quad emphasis. Control the negative.",
    early === 0 ? [7, 8] : undefined);

const b1_snatchGripRdl = (early: number, last: number): Exercise =>
  ex("b1-snatch-grip-rdl", "Snatch-Grip RDL", "Barbell RDL",
    "hamstrings", [120, 180], "2-set", [6, 8], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Wide grip forces more forward lean, increasing hamstring stretch.",
    early === 0 ? [7, 8] : undefined);

const b1_sissySquat = (early: number, last: number): Exercise =>
  ex("b1-sissy-squat", "Sissy Squat", "Leg Extension",
    "quads", [60, 120], "none", [8, 10], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Hold something for balance. Lean back and let knees travel far forward.",
    early === 0 ? [8, 9] : undefined);

const b1_legPressCalf = (early: number, last: number): Exercise =>
  ex("b1-leg-press-calf", "Leg Press Calf Press", "Standing Calf Raise",
    "calves", [60, 120], "none", [6, 8], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Full ROM — heels drop below platform level at bottom, full extension at top.",
    early === 0 ? [8, 9] : undefined);

const b1_machineCrunch = (early: number, last: number): Exercise =>
  ex("b1-machine-crunch", "Machine Crunch", "Cable Crunch",
    "abs", [60, 120], "none", [8, 10], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Round the spine — don't just fold at the hips.",
    early === 0 ? [8, 9] : undefined);

// Day C – Back/Biceps
const b1_dualHandleLatPulldownC = (early: number, last: number): Exercise =>
  ex("b1-dual-handle-lat-pulldown-c", "Dual-Handle Lat Pulldown", "Neutral-Grip Lat Pulldown",
    "back", [120, 180], "2-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Pull handle out in front like a pullover-pulldown hybrid. Feel the lats.",
    early === 0 ? [7, 8] : undefined);

const b1_inclineChestSupportedRow = (early: number, last: number): Exercise =>
  ex("b1-incline-chest-supported-row", "Incline Chest-Supported DB Row", "Chest-Supported Machine Row",
    "back", [120, 180], "2-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Flare elbows out at ~45° and squeeze shoulder blades hard at the top.",
    early === 0 ? [7, 8] : undefined);

const b1_meadowsRow = (early: number, last: number): Exercise =>
  ex("b1-meadows-row", "Meadows Row", "Neutral-Grip Seated Cable Row",
    "back", [120, 180], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure+llps",
    early, last,
    "Perpendicular to barbell, row to hip. Big stretch at bottom.",
    early === 0 ? [8, 9] : undefined);

const b1_reversePecDeck = (early: number, last: number): Exercise =>
  ex("b1-reverse-pec-deck", "Reverse Pec Deck", "1-Arm 45° Cable Rear Delt Flye",
    "shoulders", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "myo-reps",
    early, last,
    "Lead with elbows, don't let traps take over.",
    early === 0 ? [8, 9] : undefined);

const b1_dbShrug = (early: number, last: number): Exercise =>
  ex("b1-db-shrug", "DB Shrug", "Machine Shrug",
    "back", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Full ROM — let traps fully stretch at bottom, squeeze hard at top.",
    early === 0 ? [8, 9] : undefined);

const b1_dbCurl = (early: number, last: number): Exercise =>
  ex("b1-db-curl", "DB Curl", "EZ-Bar Cable Curl",
    "biceps", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Supinate wrist at the top. Full extension at bottom.",
    early === 0 ? [8, 9] : undefined);

const b1_dbPreacherCurl = (early: number, last: number): Exercise =>
  ex("b1-db-preacher-curl", "DB Preacher Curl", "Machine Preacher Curl",
    "biceps", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "myo-reps",
    early, last,
    "Full stretch at bottom — do not short the ROM.",
    early === 0 ? [8, 9] : undefined);

// Day D – Push
const b1_dbBenchPress = (early: number, last: number): Exercise =>
  ex("b1-db-bench-press", "DB Bench Press", "Barbell Bench Press",
    "chest", [180, 300], "3-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Set up a comfortable arch, quick pause on chest, explode up each rep.",
    early === 0 ? [7, 8] : undefined);

const b1_seatedDbShoulderPress = (early: number, last: number): Exercise =>
  ex("b1-seated-db-shoulder-press", "Seated DB Shoulder Press", "Machine Shoulder Press",
    "shoulders", [120, 180], "2-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Ensure elbows break at least 90°. Mind-muscle connection with delts.",
    early === 0 ? [7, 8] : undefined);

const b1_lowToHighCableCrossover = (early: number, last: number): Exercise =>
  ex("b1-low-to-high-crossover", "Low-to-High Cable Crossover", "Bottom-Half DB Flye",
    "chest", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Drive arms up and across — peak contraction above shoulder height.",
    early === 0 ? [8, 9] : undefined);

const b1_highCableLateralRaise = (early: number, last: number): Exercise =>
  ex("b1-high-cable-cuffed-lateral", "High-Cable Cuffed Lateral Raise", "High-Cable Lateral Raise",
    "shoulders", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "myo-reps",
    early, last,
    "Cable cuff on wrist. Cross-body pull for peak delt stretch.",
    early === 0 ? [8, 9] : undefined);

const b1_dbSkullCrusherD = (early: number, last: number): Exercise =>
  ex("b1-db-skull-crusher-d", "DB Skull Crusher", "Overhead Cable Triceps Extension (Bar)",
    "triceps", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Lower DBs to sides of head. Keep elbows pointing straight up.",
    early === 0 ? [8, 9] : undefined);

const b1_benchDip = (early: number, last: number): Exercise =>
  ex("b1-bench-dip", "Bench Dip", "Cable Triceps Kickback",
    "triceps", [60, 120], "none", [12, 15], [7, 8], "failure",
    early, last,
    "Feet elevated. Full depth — upper arms parallel to floor at bottom.");

const b1_modifiedCandlestick = (early: number, last: number): Exercise =>
  ex("b1-modified-candlestick", "Modified Candlestick", "Roman Chair Leg Raise",
    "abs", [60, 120], "none", [10, 20], [7, 8], "failure",
    early, last,
    "Controlled lowering. Feel the abs the entire way.");

// Day E – Lower B
const b1_dbWalkingLunge = (early: number, last: number): Exercise =>
  ex("b1-db-walking-lunge", "DB Walking Lunge", "Leg Press",
    "quads", [120, 180], "2-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Feet lower on the platform for more quad focus. Control negative, slight pause at bottom.",
    early === 0 ? [7, 8] : undefined);

const b1_nordicHamCurlE = (early: number, last: number): Exercise =>
  ex("b1-nordic-ham-curl-e", "Nordic Ham Curl", "Seated Leg Curl",
    "hamstrings", [60, 120], "1-set", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Lean forward over the machine for maximum hamstring stretch.",
    early === 0 ? [8, 9] : undefined);

const b1_gobletSquat = (early: number, last: number): Exercise =>
  ex("b1-goblet-squat", "Goblet Squat", "DB Bulgarian Split Squat",
    "quads", [120, 180], "2-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Hold DB at chest. Upright torso. Lower all the way down until front thigh is parallel.",
    early === 0 ? [7, 8] : undefined);

const b1_sissySquatE = (early: number, last: number): Exercise =>
  ex("b1-sissy-squat-e", "Sissy Squat", "Leg Extension",
    "quads", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "myo-reps",
    early, last,
    "Hold something for balance. Lean back and let knees travel far forward.",
    early === 0 ? [8, 9] : undefined);

const b1_copenhagenHipAdduction = (early: number, last: number): Exercise =>
  ex("b1-copenhagen-hip-adduction", "Copenhagen Hip Adduction", "Cable Hip Adduction",
    "hips", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Side plank with top leg on bench. Drive inner thigh toward bench.",
    early === 0 ? [8, 9] : undefined);

const b1_lateralBandWalk = (early: number, last: number): Exercise =>
  ex("b1-lateral-band-walk", "Lateral Band Walk", "Cable Hip Abduction",
    "hips", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Band above knees. Keep tension throughout — don't let knees cave.",
    early === 0 ? [8, 9] : undefined);

const b1_legPressCalfE = (early: number, last: number): Exercise =>
  ex("b1-leg-press-calf-e", "Leg Press Calf Press", "Seated Calf Raise",
    "calves", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "static-stretch",
    early, last,
    "Full ROM. Static stretch 30s after last set.",
    early === 0 ? [8, 9] : undefined);

// ─── Block 2 exercises (Weeks 6–12) ────────────────────────────────────────────

// Day A – Upper A (Block 2 — same slot, different exercises for some)
const b2_inclineMachinePress = (early: number, last: number): Exercise =>
  ex("b2-incline-machine-press", "45° Incline Machine Press", "45° Incline Barbell Press",
    "chest", [180, 300], "3-set", [8, 10],
    [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "1 second pause at the bottom of each rep.",
    early === 0 ? [7, 8] : undefined);

const b2_bottomHalfFlye = (early: number, last: number): Exercise =>
  ex("b2-bottom-half-flye", "Bottom-Half DB Flye", "Cable Crossover Ladder",
    "chest", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Only lower halfway. For Cable Crossover Ladder: one set low, one medium, one high.",
    early === 0 ? [8, 9] : undefined);

const b2_wideGripPullUp = (early: number, last: number): Exercise =>
  ex("b2-wide-grip-pull-up", "Wide-Grip Pull-Up", "Wide-Grip Lat Pulldown",
    "back", [120, 180], "2-set", [10, 12], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Full dead hang at bottom. Lead with chest, not chin.",
    early === 0 ? [7, 8] : undefined);

const b2_leanInLateralRaise = (early: number, last: number): Exercise =>
  ex("b2-lean-in-lateral-raise", "Lean-In DB Lateral Raise", "High-Cable Lateral Raise",
    "shoulders", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Lean into rack to pre-stretch delt. Lead with elbow.",
    early === 0 ? [8, 9] : undefined);

const b2_singleArmDbRow = (early: number, last: number): Exercise =>
  ex("b2-single-arm-db-row", "Single-Arm DB Row", "Pendlay Deficit Row",
    "back", [120, 180], "1-set", [8, 10], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Full stretch at bottom. Drive elbow behind hip at top.",
    early === 0 ? [8, 9] : undefined);

const b2_dbSkullCrusher = (early: number, last: number): Exercise =>
  ex("b2-db-skull-crusher", "DB Skull Crusher", "Overhead Cable Triceps Extension (Rope)",
    "triceps", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Lower DBs to sides of head. Elbows pointing straight up.",
    early === 0 ? [8, 9] : undefined);

const b2_inclineDbStretchCurl = (early: number, last: number): Exercise =>
  ex("b2-incline-db-stretch-curl", "Incline DB Stretch Curl", "Seated Super-Bayesian High Cable Curl",
    "biceps", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Full shoulder extension at bottom for maximum stretch.",
    early === 0 ? [8, 9] : undefined);

// Day B – Lower A (Block 2)
const b2_nordicHamCurl = (early: number, last: number): Exercise =>
  ex("b2-nordic-ham-curl", "Nordic Ham Curl", "Lying Leg Curl",
    "hamstrings", [60, 120], "2-set", [10, 12], [7, 8], early === 0 ? "rpe" : "failure+llps",
    early, last,
    "Set machine for max stretch. Prevent hips from rising.",
    early === 0 ? [8, 9] : undefined);

const b2_highBarBackSquat = (early: number, last: number): Exercise =>
  ex("b2-high-bar-back-squat", "High-Bar Back Squat", "Smith Machine Static Lunge w/ Elevated Front Foot",
    "quads", [180, 300], "4-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Feet forward for more quad emphasis. Controlled negative.",
    early === 0 ? [7, 8] : undefined);

const b2_cablePullThrough = (early: number, last: number): Exercise =>
  ex("b2-cable-pull-through", "Cable Pull-Through", "45° Hyperextension",
    "glutes", [120, 180], "2-set", [8, 10], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Hip hinge pattern. Full hip extension at top — squeeze glutes hard.",
    early === 0 ? [7, 8] : undefined);

const b2_sissySquat = (early: number, last: number): Exercise =>
  ex("b2-sissy-squat", "Sissy Squat", "Leg Extension",
    "quads", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Knees travel forward. Controlled descent.",
    early === 0 ? [8, 9] : undefined);

const b2_standingCalfRaise = (early: number, last: number): Exercise =>
  ex("b2-standing-calf-raise", "Standing Calf Raise", "Leg Press Calf Press",
    "calves", [60, 120], "none", [8, 10], [7, 8], early === 0 ? "rpe" : "static-stretch",
    early, last,
    "Full ROM. Static stretch 30s after last set.",
    early === 0 ? [8, 9] : undefined);

const b2_cableCrunch = (early: number, last: number): Exercise =>
  ex("b2-cable-crunch", "Cable Crunch", "Machine Crunch",
    "abs", [60, 120], "none", [10, 12], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Round the spine — elbows to knees. Don't just fold at hips.",
    early === 0 ? [8, 9] : undefined);

// Day C – Back/Biceps (Block 2)
const b2_pullUp = (early: number, last: number): Exercise =>
  ex("b2-pull-up", "Pull-Up", "Lean-Back Machine Pulldown",
    "back", [120, 180], "2-set", [10, 12], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Initiate with straight posture. As you pull, lean back slightly and chest to bar.",
    early === 0 ? [7, 8] : undefined);

const b2_inclineChestSupportedRow = (early: number, last: number): Exercise =>
  ex("b2-incline-chest-supported-row", "Incline Chest-Supported DB Row", "Chest-Supported Machine Row",
    "back", [120, 180], "2-set", [10, 12], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Flare elbows ~45°. Squeeze shoulder blades at top.",
    early === 0 ? [7, 8] : undefined);

const b2_meadowsRow = (early: number, last: number): Exercise =>
  ex("b2-meadows-row", "Meadows Row", "Dual-Handle Elbows-Out Cable Row",
    "back", [120, 180], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure+llps",
    early, last,
    "Full stretch at bottom. Drive elbow to ceiling.",
    early === 0 ? [8, 9] : undefined);

const b2_reversePecDeck = (early: number, last: number): Exercise =>
  ex("b2-reverse-pec-deck", "Reverse Pec Deck", "1-Arm 45° Cable Rear Delt Flye",
    "shoulders", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "myo-reps",
    early, last,
    "Lead with elbows. No traps.",
    early === 0 ? [8, 9] : undefined);

const b2_dbShrug = (early: number, last: number): Exercise =>
  ex("b2-db-shrug", "DB Shrug", "Cable Paused Shrug-In",
    "back", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Pause at top 1–2 sec. Full stretch at bottom.",
    early === 0 ? [8, 9] : undefined);

const b2_hammerPreacherCurl = (early: number, last: number): Exercise =>
  ex("b2-hammer-preacher-curl", "Hammer Preacher Curl", "Cable Rope Hammer Curl",
    "biceps", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Neutral grip. Full ROM — squeeze brachialis at top.",
    early === 0 ? [8, 9] : undefined);

const b2_dbPreacherCurl = (early: number, last: number): Exercise =>
  ex("b2-db-preacher-curl", "DB Preacher Curl", "DB Concentration Curl",
    "biceps", [60, 120], "none", [15, 20], [7, 8], "myo-reps",
    early, last,
    "Full extension at bottom. No swinging.");

// Day D – Push (Block 2)
const b2_dbBenchPress = (early: number, last: number): Exercise =>
  ex("b2-db-bench-press", "DB Bench Press", "Machine Chest Press",
    "chest", [180, 300], "3-set", [10, 12], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Comfortable arch, pause on chest, explode up.",
    early === 0 ? [7, 8] : undefined);

const b2_machineShoulderPress = (early: number, last: number): Exercise =>
  ex("b2-machine-shoulder-press", "Machine Shoulder Press", "Seated DB Shoulder Press",
    "shoulders", [120, 180], "2-set", [10, 12], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Full ROM. Mind-muscle connection with delts.",
    early === 0 ? [7, 8] : undefined);

const b2_lowToHighCrossover = (early: number, last: number): Exercise =>
  ex("b2-low-to-high-crossover", "Low-to-High Cable Crossover", "Bottom-Half Seated Cable Flye",
    "chest", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Drive arms upward and across. Peak contraction above shoulder.",
    early === 0 ? [8, 9] : undefined);

const b2_leanInLateralRaiseD = (early: number, last: number): Exercise =>
  ex("b2-lean-in-lateral-raise-d", "Lean-In DB Lateral Raise", "High-Cable Cuffed Lateral Raise",
    "shoulders", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "myo-reps",
    early, last,
    "Lean into rack. Lead with elbow for peak delt stretch.",
    early === 0 ? [8, 9] : undefined);

const b2_katanaTricepsExt = (early: number, last: number): Exercise =>
  ex("b2-katana-triceps-ext", "Katana Triceps Extension", "EZ-Bar Skull Crusher",
    "triceps", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Arc the bar like a katana swing — full overhead stretch to lockout.",
    early === 0 ? [8, 9] : undefined);

const b2_dbTricepsKickback = (early: number, last: number): Exercise =>
  ex("b2-db-triceps-kickback", "DB Triceps Kickback", "Triceps Pressdown (Bar)",
    "triceps", [60, 120], "none", [15, 20], [7, 8], "myo-reps",
    early, last,
    "Full extension. Hinge at elbow only — upper arm stays parallel to floor.");

const b2_longLeverPlank = (early: number, last: number): Exercise =>
  ex("b2-long-lever-plank", "Long-Lever Plank", "Swiss Ball Rollout",
    "abs", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Elbows forward of shoulders. Maintain neutral spine.",
    early === 0 ? [8, 9] : undefined);

// Day E – Lower B (Block 2)
const b2_dbWalkingLunge = (early: number, last: number): Exercise =>
  ex("b2-db-walking-lunge", "DB Walking Lunge", "Hack Squat",
    "quads", [120, 180], "2-set", [10, 12], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Long stride. Controlled descent. Drive through front heel.",
    early === 0 ? [7, 8] : undefined);

const b2_nordicHamCurlE = (early: number, last: number): Exercise =>
  ex("b2-nordic-ham-curl-e", "Nordic Ham Curl", "Seated Leg Curl",
    "hamstrings", [60, 120], "1-set", [12, 15], [7, 8], early === 0 ? "rpe" : "failure+llps",
    early, last,
    "Lean forward for hamstring stretch.",
    early === 0 ? [8, 9] : undefined);

const b2_dbStaticLunge = (early: number, last: number): Exercise =>
  ex("b2-db-static-lunge", "DB Static Lunge", "Walking Lunge",
    "quads", [120, 180], "2-set", [10, 12], [6, 7], early === 0 ? "rpe" : "failure",
    early, last,
    "Front foot elevated for deeper range. Drive through heel.",
    early === 0 ? [7, 8] : undefined);

const b2_sissySquatE = (early: number, last: number): Exercise =>
  ex("b2-sissy-squat-e", "Sissy Squat", "Leg Extension",
    "quads", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "myo-reps",
    early, last,
    "Full ROM. Control the negative.",
    early === 0 ? [8, 9] : undefined);

const b2_copenhagenHipAdduction = (early: number, last: number): Exercise =>
  ex("b2-copenhagen-hip-adduction", "Copenhagen Hip Adduction", "Machine Hip Adduction",
    "hips", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Drive inner thigh toward bench. Full ROM.",
    early === 0 ? [8, 9] : undefined);

const b2_lateralBandWalk = (early: number, last: number): Exercise =>
  ex("b2-lateral-band-walk", "Lateral Band Walk", "Machine Hip Abduction",
    "hips", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "failure",
    early, last,
    "Band above knees. Maintain tension throughout.",
    early === 0 ? [8, 9] : undefined);

const b2_seatedCalfRaise = (early: number, last: number): Exercise =>
  ex("b2-seated-calf-raise", "Seated Calf Raise", "Standing Calf Raise",
    "calves", [60, 120], "none", [12, 15], [7, 8], early === 0 ? "rpe" : "static-stretch",
    early, last,
    "Full ROM. Static stretch 30s after last set.",
    early === 0 ? [8, 9] : undefined);

// ─── Day builders ──────────────────────────────────────────────────────────────

function block1DayA(isIntroWeek: boolean): WorkoutDay {
  const e = isIntroWeek ? 0 : 2;
  const l = 1;
  return {
    dayType: "upper-a",
    exercises: [
      b1_inclineMachinePress(isIntroWeek ? 0 : 2, l),
      b1_bottomHalfFlyeA(isIntroWeek ? 0 : 1, l),
      b1_dualHandleLatPulldown(isIntroWeek ? 0 : 2, l),
      b1_leanInLateralRaise(isIntroWeek ? 0 : 1, l),
      b1_singleArmDbRow(isIntroWeek ? 0 : 1, l),
      b1_dbSkullCrusher(isIntroWeek ? 0 : 1, l),
      b1_inclineDbStretchCurl(isIntroWeek ? 0 : 1, l),
    ],
  };
  void e;
}

function block1DayB(isIntroWeek: boolean): WorkoutDay {
  const l = 1;
  return {
    dayType: "lower-a",
    exercises: [
      b1_nordicHamCurl(isIntroWeek ? 0 : 1, l),
      b1_highBarBackSquat(isIntroWeek ? 0 : 2, l),
      b1_snatchGripRdl(isIntroWeek ? 0 : 2, l),
      b1_sissySquat(isIntroWeek ? 0 : 1, l),
      b1_legPressCalf(isIntroWeek ? 0 : 1, l),
      b1_machineCrunch(isIntroWeek ? 0 : 1, l),
    ],
  };
  void l;
}

function block1DayC(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "back-biceps",
    exercises: [
      b1_dualHandleLatPulldownC(isIntroWeek ? 0 : 1, 1),
      b1_inclineChestSupportedRow(isIntroWeek ? 0 : 2, 1),
      b1_meadowsRow(isIntroWeek ? 0 : 1, 1),
      b1_reversePecDeck(isIntroWeek ? 0 : 1, 1),
      b1_dbShrug(isIntroWeek ? 0 : 1, 1),
      b1_dbCurl(isIntroWeek ? 0 : 1, 1),
      b1_dbPreacherCurl(isIntroWeek ? 0 : 0, 1),
    ],
  };
}

function block1DayD(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "push",
    exercises: [
      b1_dbBenchPress(isIntroWeek ? 0 : 2, 1),
      b1_seatedDbShoulderPress(isIntroWeek ? 0 : 1, 1),
      b1_lowToHighCableCrossover(isIntroWeek ? 0 : 1, 1),
      b1_highCableLateralRaise(isIntroWeek ? 0 : 1, 1),
      b1_dbSkullCrusherD(isIntroWeek ? 0 : 1, 1),
      b1_benchDip(0, 1),
      b1_modifiedCandlestick(isIntroWeek ? 0 : 1, 1),
    ],
  };
}

function block1DayE(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "lower-b",
    exercises: [
      b1_dbWalkingLunge(isIntroWeek ? 0 : 2, 1),
      b1_nordicHamCurlE(isIntroWeek ? 0 : 1, 1),
      b1_gobletSquat(isIntroWeek ? 0 : 1, 1),
      b1_sissySquatE(isIntroWeek ? 0 : 1, 1),
      b1_copenhagenHipAdduction(isIntroWeek ? 0 : 1, 1),
      b1_lateralBandWalk(isIntroWeek ? 0 : 1, 1),
      b1_legPressCalfE(isIntroWeek ? 0 : 1, 1),
    ],
  };
}

function block2DayA(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "upper-a",
    exercises: [
      b2_inclineMachinePress(isIntroWeek ? 0 : 2, 1),
      b2_bottomHalfFlye(isIntroWeek ? 0 : 1, 1),
      b2_wideGripPullUp(isIntroWeek ? 0 : 2, 1),
      b2_leanInLateralRaise(isIntroWeek ? 0 : 1, 1),
      b2_singleArmDbRow(isIntroWeek ? 0 : 2, 1),
      b2_dbSkullCrusher(isIntroWeek ? 0 : 1, 1),
      b2_inclineDbStretchCurl(isIntroWeek ? 0 : 1, 1),
    ],
  };
}

function block2DayB(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "lower-a",
    exercises: [
      b2_nordicHamCurl(isIntroWeek ? 0 : 1, 1),
      b2_highBarBackSquat(isIntroWeek ? 0 : 2, 1),
      b2_cablePullThrough(isIntroWeek ? 0 : 1, 1),
      b2_sissySquat(isIntroWeek ? 0 : 1, 1),
      b2_standingCalfRaise(isIntroWeek ? 0 : 1, 1),
      b2_cableCrunch(isIntroWeek ? 0 : 1, 1),
    ],
  };
}

function block2DayC(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "back-biceps",
    exercises: [
      b2_pullUp(isIntroWeek ? 0 : 1, 1),
      b2_inclineChestSupportedRow(isIntroWeek ? 0 : 2, 1),
      b2_meadowsRow(isIntroWeek ? 0 : 1, 1),
      b2_reversePecDeck(isIntroWeek ? 0 : 1, 1),
      b2_dbShrug(isIntroWeek ? 0 : 1, 1),
      b2_hammerPreacherCurl(isIntroWeek ? 0 : 1, 1),
      b2_dbPreacherCurl(0, 1),
    ],
  };
}

function block2DayD(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "push",
    exercises: [
      b2_dbBenchPress(isIntroWeek ? 0 : 2, 1),
      b2_machineShoulderPress(isIntroWeek ? 0 : 1, 1),
      b2_lowToHighCrossover(isIntroWeek ? 0 : 1, 1),
      b2_leanInLateralRaiseD(isIntroWeek ? 0 : 1, 1),
      b2_katanaTricepsExt(isIntroWeek ? 0 : 1, 1),
      b2_dbTricepsKickback(0, 1),
      b2_longLeverPlank(isIntroWeek ? 0 : 1, 1),
    ],
  };
}

function block2DayE(isIntroWeek: boolean): WorkoutDay {
  return {
    dayType: "lower-b",
    exercises: [
      b2_dbWalkingLunge(isIntroWeek ? 0 : 2, 1),
      b2_nordicHamCurlE(isIntroWeek ? 0 : 1, 1),
      b2_dbStaticLunge(isIntroWeek ? 0 : 1, 1),
      b2_sissySquatE(isIntroWeek ? 0 : 1, 1),
      b2_copenhagenHipAdduction(isIntroWeek ? 0 : 1, 1),
      b2_lateralBandWalk(isIntroWeek ? 0 : 1, 1),
      b2_seatedCalfRaise(isIntroWeek ? 0 : 1, 1),
    ],
  };
}

// ─── Full 12-week schedule ─────────────────────────────────────────────────────

export const PROGRAM: WeekSchedule[] = [
  // Week 1 — Block 1 intro/deload
  { week: 1, days: [block1DayA(true), block1DayB(true), block1DayC(true), block1DayD(true), block1DayE(true)] },
  // Weeks 2–5 — Block 1 working
  { week: 2, days: [block1DayA(false), block1DayB(false), block1DayC(false), block1DayD(false), block1DayE(false)] },
  { week: 3, days: [block1DayA(false), block1DayB(false), block1DayC(false), block1DayD(false), block1DayE(false)] },
  { week: 4, days: [block1DayA(false), block1DayB(false), block1DayC(false), block1DayD(false), block1DayE(false)] },
  { week: 5, days: [block1DayA(false), block1DayB(false), block1DayC(false), block1DayD(false), block1DayE(false)] },
  // Week 6 — Block 2 intro/deload
  { week: 6, days: [block2DayA(true), block2DayB(true), block2DayC(true), block2DayD(true), block2DayE(true)] },
  // Weeks 7–12 — Block 2 working
  { week: 7, days: [block2DayA(false), block2DayB(false), block2DayC(false), block2DayD(false), block2DayE(false)] },
  { week: 8, days: [block2DayA(false), block2DayB(false), block2DayC(false), block2DayD(false), block2DayE(false)] },
  { week: 9, days: [block2DayA(false), block2DayB(false), block2DayC(false), block2DayD(false), block2DayE(false)] },
  { week: 10, days: [block2DayA(false), block2DayB(false), block2DayC(false), block2DayD(false), block2DayE(false)] },
  { week: 11, days: [block2DayA(false), block2DayB(false), block2DayC(false), block2DayD(false), block2DayE(false)] },
  { week: 12, days: [block2DayA(false), block2DayB(false), block2DayC(false), block2DayD(false), block2DayE(false)] },
];

export const DAY_LABELS: Record<string, string> = {
  "upper-a": "Upper A",
  "lower-a": "Lower A",
  "back-biceps": "Back & Biceps",
  push: "Push",
  "lower-b": "Lower B",
};

export const WARMUP_PROTOCOLS: Record<string, string[]> = {
  "none": [],
  "1-set": ["~60% × 6–10 reps (feel warm and loose)"],
  "2-set": [
    "Set 1: ~50% × 6–10 reps",
    "Set 2: ~75% × 4–6 reps",
  ],
  "3-set": [
    "Set 1: ~45% × 6–10 reps",
    "Set 2: ~65% × 4–6 reps",
    "Set 3: ~85% × 3–4 reps",
  ],
  "4-set": [
    "Set 1: ~45% × 6–10 reps",
    "Set 2: ~60% × 4–6 reps",
    "Set 3: ~75% × 3–5 reps",
    "Set 4: ~85% × 2–4 reps",
  ],
};

export const FAILURE_TECHNIQUE_LABELS: Record<string, { label: string; description: string }> = {
  failure: {
    label: "To Failure",
    description: "Push until you cannot complete another rep with good form. Rack the bar or set down the weight safely.",
  },
  "failure+llps": {
    label: "Failure + LLPs",
    description: "After reaching failure, immediately continue with Lengthened Partial Reps — short partials in the bottom/stretched portion of the movement until you cannot move the weight at all.",
  },
  "myo-reps": {
    label: "Myo-Reps",
    description: "Do your activation set to near-failure. Rest 3–5 breaths, then do clusters of 3–5 reps, resting 3–5 breaths between each cluster, until you can no longer complete 3 reps.",
  },
  "static-stretch": {
    label: "Static Stretch (30s)",
    description: "After the last set, hold the stretched position of the movement for 30 seconds.",
  },
  rpe: {
    label: "RPE Target",
    description: "Stop when the target RPE is reached — not to failure.",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function getWorkoutDay(week: number, dayIndex: number): WorkoutDay | null {
  const weekData = PROGRAM.find((w) => w.week === week);
  return weekData?.days[dayIndex] ?? null;
}

export function getTotalSessions(): number {
  return PROGRAM.reduce((acc, w) => acc + w.days.length, 0);
}

export function getSessionNumber(week: number, dayIndex: number): number {
  let count = 0;
  for (const w of PROGRAM) {
    if (w.week === week) {
      count += dayIndex;
      break;
    }
    count += w.days.length;
  }
  return count + 1;
}

/** Estimate 1RM using the Epley formula */
export function estimateOneRm(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}
