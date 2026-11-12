/**
 * Static snapshot of the full program — used ONLY by scripts/seed-program.ts.
 * No app code should import from this file.
 */
import type { Exercise, WorkoutDay, WeekSchedule, WarmupProtocol } from "./types";

function ex(
  id: string,
  name: string,
  alternates: [string, string],
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
  return { id, name, alternates, muscleGroup, restSeconds, warmupProtocol, repRange, earlySetRpe, lastSetTarget, lastSetRpe, earlySetCount, lastSetCount, formNote, isBodyweight: false, weightPerSide: false };
}

// ─── Foundation Block (Weeks 1–5) ─────────────────────────────────────────────

function foundationUpperA(e: number, l: number, intro = false): WorkoutDay {
  const t = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];
  return {
    dayType: "upper-a",
    exercises: [
      ex("f-incline-barbell", "45° Incline Barbell Press", ["45° Incline DB Press", "45° Incline Machine Press"], "chest", [180, 300], "3-set", [6, 8], [6, 7], t, e, l, "1-second pause at the bottom while maintaining tension on the pecs.", intro ? [7, 8] : undefined),
      ex("f-cable-crossover", "Cable Crossover Ladder", ["Pec Deck", "Bottom-Half DB Flye"], "chest", [60, 120], "2-set", [8, 10], [8, 9], t, Math.max(e - 1, 1), l, "One set each at low, mid, and high cable positions. Focus on elbows together, not hands.", intro ? rpe : undefined),
      ex("f-wide-grip-pullup", "Wide-Grip Pull-Up", ["Wide-Grip Lat Pulldown", "Dual-Handle Lat Pulldown"], "back", [120, 180], "2-set", [8, 10], [6, 7], t, e, l, "1.5× shoulder-width overhand grip. 2–3 second negative. Feel lats pulling apart on the way down.", intro ? [7, 8] : undefined),
      ex("f-high-cable-lateral-push", "High-Cable Lateral Raise", ["High-Cable Cuffed Lateral Raise", "Lean-In DB Lateral Raise"], "shoulders", [60, 120], "none", [8, 10], [8, 9], t, Math.max(e - 1, 1), l, "Focus on squeezing your lateral delt to move the weight.", intro ? rpe : undefined),
      ex("f-pendlay-row", "Pendlay Deficit Row", ["Smith Machine Row", "Single-Arm DB Row"], "back", [120, 180], "2-set", [6, 8], [8, 9], llps, Math.max(e - 1, 1), l, "Stand on a bumper plate. Focus on a big stretch — touch your stomach/chest each rep.", intro ? rpe : undefined),
      ex("f-ohc-triceps-bar-push", "Overhead Cable Triceps Extension (Bar)", ["Overhead Cable Triceps Extension (Rope)", "DB Skull Crusher"], "triceps", [60, 120], "1-set", [8, 10], [8, 9], t, Math.max(e - 1, 1), l, "Optionally pause 0.5–1 second in the stretched position each rep.", intro ? rpe : undefined),
      ex("f-bayesian-curl-ua", "Bayesian Cable Curl", ["Bayesian High Cable Curl", "Incline DB Stretch Curl"], "biceps", [60, 120], "1-set", [8, 10], [8, 9], t, Math.max(e - 1, 1), l, "If one arm is weaker, train it first — then match reps with the stronger arm.", intro ? rpe : undefined),
    ],
  };
}

function foundationLowerA(e: number, l: number, intro = false): WorkoutDay {
  const t = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const ss = intro ? ("rpe" as const) : ("static-stretch" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];
  return {
    dayType: "lower-a",
    exercises: [
      ex("f-lying-leg-curl", "Lying Leg Curl", ["Seated Leg Curl", "Nordic Ham Curl"], "hamstrings", [60, 120], "2-set", [8, 10], [7, 8], llps, Math.max(e - 1, 1), l, "Set machine for maximum stretch at the bottom. Prevent your butt from popping up.", intro ? rpe : undefined),
      ex("f-smith-squat", "Smith Machine Squat", ["DB Bulgarian Split Squat", "High-Bar Back Squat"], "quads", [180, 300], "4-set", [6, 8], [6, 7], t, e, l, "Feet 3–6 inches forward for more upright squat. Heels rising? Move feet further forward.", intro ? [7, 8] : undefined),
      ex("f-barbell-rdl", "Barbell RDL", ["DB RDL", "Snatch-Grip RDL"], "hamstrings", [120, 180], "4-set", [6, 8], [6, 7], t, e, l, "Stop ~75% of the way to lockout to maintain hamstring tension (bottom 3/4 ROM).", intro ? [7, 8] : undefined),
      ex("f-leg-ext-la", "Leg Extension", ["Reverse Nordic", "Sissy Squat"], "quads", [60, 120], "2-set", [8, 10], [7, 8], t, Math.max(e - 1, 1), l, "Seat all the way back. Grab handles to pull hips down. 2–3 second negative.", intro ? rpe : undefined),
      ex("f-standing-calf-la", "Standing Calf Raise", ["Seated Calf Raise", "Leg Press Calf Press"], "calves", [60, 120], "2-set", [6, 8], [7, 8], ss, Math.max(e - 1, 1), l, "1–2 second pause at the bottom. Roll your ankle on the balls of your feet.", intro ? rpe : undefined),
      ex("f-cable-crunch", "Cable Crunch", ["Decline Weighted Crunch", "Machine Crunch"], "abs", [60, 120], "1-set", [8, 10], [7, 8], t, Math.max(e - 1, 1), l, "Round your lower back as you crunch. Maintain mind-muscle connection with your abs.", intro ? rpe : undefined),
    ],
  };
}

function foundationBackBiceps(e: number, l: number, intro = false): WorkoutDay {
  const t = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const myo = intro ? ("rpe" as const) : ("myo-reps" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];
  return {
    dayType: "back-biceps",
    exercises: [
      ex("f-neutral-lat-pulldown", "Neutral-Grip Lat Pulldown", ["Neutral-Grip Pull-Up", "Dual-Handle Lat Pulldown"], "back", [120, 180], "3-set", [8, 10], [6, 7], t, e, l, "Handle more out in front — like a cross between pullover and pulldown. Feel the lats.", intro ? [7, 8] : undefined),
      ex("f-cs-machine-row", "Chest-Supported Machine Row", ["Chest-Supported T-Bar Row", "Incline Chest-Supported DB Row"], "back", [120, 180], "3-set", [8, 10], [6, 7], t, e, l, "Flare elbows ~45°. Squeeze shoulder blades together hard at the top.", intro ? [7, 8] : undefined),
      ex("f-seated-cable-row", "Neutral-Grip Seated Cable Row", ["Helms Row", "Meadows Row"], "back", [120, 180], "2-set", [10, 12], [7, 8], llps, Math.max(e - 1, 1), l, "Squeeze shoulder blades together, driving elbows down and back.", intro ? rpe : undefined),
      ex("f-rear-delt-flye", "1-Arm 45° Cable Rear Delt Flye", ["Rope Face Pull", "Reverse Pec Deck"], "shoulders", [60, 120], "2-set", [10, 12], [7, 8], myo, Math.max(e - 1, 1), l, "Pause 1–2 seconds in the squeeze. Contract the rear delts hard!", intro ? rpe : undefined),
      ex("f-machine-shrug", "Machine Shrug", ["Cable Paused Shrug-In", "DB Shrug"], "back", [60, 120], "3-set", [10, 12], [7, 8], t, Math.max(e - 1, 1), l, "Brief pause at the top. Think about pulling your shoulders up to your ears!", intro ? rpe : undefined),
      ex("f-ez-cable-curl", "EZ-Bar Cable Curl", ["EZ-Bar Curl", "DB Curl"], "biceps", [60, 120], "1-set", [10, 12], [7, 8], t, Math.max(e - 1, 1), l, "Cable at the lowest position. Maintain constant tension. Slow, controlled reps!", intro ? rpe : undefined),
      ex("f-machine-preacher", "Machine Preacher Curl", ["EZ-Bar Preacher Curl", "DB Preacher Curl"], "biceps", [60, 120], "1-set", [12, 15], [8, 9], myo, 0, 1, "Smooth, controlled reps. Mind-muscle connection with the biceps.", intro ? [8, 9] : undefined),
    ],
  };
}

function foundationPush(e: number, l: number, intro = false): WorkoutDay {
  const t = intro ? ("rpe" as const) : ("failure" as const);
  const myo = intro ? ("rpe" as const) : ("myo-reps" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];
  return {
    dayType: "push",
    exercises: [
      ex("f-bench-press", "Barbell Bench Press", ["Machine Chest Press", "DB Bench Press"], "chest", [180, 300], "4-set", [8, 10], [6, 7], t, e, l, "Set up a comfortable arch; quick pause on the chest and explode up.", intro ? [7, 8] : undefined),
      ex("f-machine-shoulder-press", "Machine Shoulder Press", ["Cable Shoulder Press", "Seated DB Shoulder Press"], "shoulders", [120, 180], "3-set", [8, 10], [6, 7], t, Math.max(e - 1, 1), l, "Elbows break at least 90°. Mind-muscle connection with your delts. Smooth, controlled.", intro ? [7, 8] : undefined),
      ex("f-bottom-half-flye", "Bottom-Half DB Flye", ["Bottom-Half Seated Cable Flye", "Low-to-High Cable Crossover"], "chest", [60, 120], "2-set", [10, 12], [7, 8], t, Math.max(e - 1, 1), l, "All reps in the bottom half of ROM. Focus on a deep pec stretch at the bottom.", intro ? rpe : undefined),
      ex("f-high-cable-lateral-push", "High-Cable Lateral Raise", ["High-Cable Cuffed Lateral Raise", "Lean-In DB Lateral Raise"], "shoulders", [60, 120], "none", [10, 12], [8, 9], myo, Math.max(e - 1, 1), l, "Focus on squeezing your lateral delt to move the weight.", intro ? rpe : undefined),
      ex("f-ohc-triceps-bar-push", "Overhead Cable Triceps Extension (Bar)", ["Overhead Cable Triceps Extension (Rope)", "DB Skull Crusher"], "triceps", [60, 120], "1-set", [10, 12], [7, 8], t, Math.max(e - 1, 1), l, "Optionally pause 0.5–1 second in the stretched position.", intro ? rpe : undefined),
      ex("f-cable-kickback", "Cable Triceps Kickback", ["DB Triceps Kickback", "Bench Dip"], "triceps", [60, 120], "none", [12, 15], [8, 9], myo, 0, 1, "Upright or bent over — either works. At full squeeze, shoulder should be behind torso.", intro ? [8, 9] : undefined),
      ex("f-roman-chair-raise", "Roman Chair Leg Raise", ["Hanging Leg Raise", "Modified Candlestick"], "abs", [60, 120], "2-set", [10, 20], [7, 8], t, Math.max(e - 1, 1), l, "Round your lower back as you curl your legs up. 10–20 reps — go until you hit the target RPE.", intro ? rpe : undefined),
    ],
  };
}

function foundationLowerB(e: number, l: number, intro = false): WorkoutDay {
  const t = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const myo = intro ? ("rpe" as const) : ("myo-reps" as const);
  const ss = intro ? ("rpe" as const) : ("static-stretch" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];
  return {
    dayType: "lower-b",
    exercises: [
      ex("f-leg-press", "Leg Press", ["Smith Machine Static Lunge", "DB Walking Lunge"], "quads", [120, 180], "4-set", [8, 10], [6, 7], t, e, l, "Feet lower for quad focus. Deep as possible, control the negative, slight pause at bottom.", intro ? [7, 8] : undefined),
      ex("f-seated-leg-curl", "Seated Leg Curl", ["Lying Leg Curl", "Nordic Ham Curl"], "hamstrings", [60, 120], "2-set", [10, 12], [7, 8], llps, Math.max(e - 1, 1), l, "Lean forward over the machine for maximum hamstring stretch.", intro ? rpe : undefined),
      ex("f-bulgarian-split-squat", "DB Bulgarian Split Squat", ["DB Step-Up", "Goblet Squat"], "quads", [120, 180], "3-set", [8, 10], [6, 7], t, Math.max(e - 1, 1), l, "Front thigh parallel to the floor at the bottom. Drive through your front heel on the way up.", intro ? [7, 8] : undefined),
      ex("f-leg-ext-la", "Leg Extension", ["Reverse Nordic", "Sissy Squat"], "quads", [60, 120], "2-set", [10, 12], [7, 8], myo, Math.max(e - 1, 1), l, "Seat all the way back. Grab handles to pull hips down. 2–3 second negative.", intro ? rpe : undefined),
      ex("f-hip-adduction", "Machine Hip Adduction", ["Cable Hip Adduction", "Copenhagen Hip Adduction"], "hips", [60, 120], "2-set", [10, 12], [7, 8], t, Math.max(e - 1, 1), l, "Mind-muscle with inner thighs. Great for adding thigh mass from the front!", intro ? rpe : undefined),
      ex("f-hip-abduction", "Machine Hip Abduction", ["Cable Hip Abduction", "Lateral Band Walk"], "hips", [60, 120], "2-set", [10, 12], [8, 9], t, Math.max(e - 1, 1), l, "Use pads to increase ROM if possible. Lean forward to stretch the glutes.", intro ? rpe : undefined),
      ex("f-standing-calf-la", "Standing Calf Raise", ["Seated Calf Raise", "Leg Press Calf Press"], "calves", [60, 120], "2-set", [10, 12], [7, 8], ss, Math.max(e - 1, 1), l, "1–2 second pause at the bottom. Roll your ankle on the balls of your feet.", intro ? rpe : undefined),
    ],
  };
}

// ─── Ramping / Growth Block (Weeks 6–12) ──────────────────────────────────────
//
// Working-set counts per exercise, verified against the source PDF:
//
// Upper A    [InclDB, PecDk, DualPD, HiLat, SmRow, OHCTri, BaysCrl]
//   W6 intro:   [1,     1,    1,     1,     1,     1,      1     ]
//   W7–W8:      [2,     2,    2,     1,     2,     1,      1     ]
//   W9–W10:     [2,     2,    2,     1,     2,     2,      2     ]
//   W11–W12:    [3,     2,    2,     2,     2,     2,      2     ]
//
// Lower A    [LyLgCrl, SmLunge, Hyper, LgExt, ClfPrs, MchCrnch]
//   W6 intro:   [1,       1,      1,     1,     1,      1     ]
//   W7–W8:      [1,       2,      2,     2,     2,      1     ]
//   W9–W10:     [2,       2,      2,     2,     2,      2     ]
//   W11–W12:    [2,       3,      3,     2,     3,      2     ]
//
// Pull       [LBPullD, CSTBar, DualRow, RrDlt, CblShrg, RpHmr, DbConc]
//   W6 intro:   [1,     1,      1,      1,     1,       1,     0     ]
//   W7–W8:      [2,     2,      1,      2,     1,       2,     1     ]
//   W9–W10:     [2,     2,      2,      2,     2,       2,     1     ]
//   W11–W12:    [2,     3,      2,      2,     2,       2,     2     ]
//
// Push       [MchChst, DBShldr, BtmFlye, HiLat, EZSkull, TricPD, AbWhl]
//   W6 intro:   [1,      1,      1,       1,     1,       0,     1    ]
//   W7–W8:      [2,      2,      1,       2,     1,       1,     1    ]
//   W9–W10:     [2,      2,      2,       2,     1,       2,     2    ]
//   W11–W12:    [3,      2,      2,       2,     2,       2,     2    ]
//
// Lower B    [HkSqt, StLgCrl, WlkLng, LgExt, HipAdd, HipAbd, Calf]
//   W6 intro:   [1,    1,      1,      1,     1,      1,      1   ]
//   W7–W8:      [2,    2,      1,      1,     1,      1,      1   ]
//   W9–W10:     [2,    2,      1,      2,     2,      2,      2   ]
//   W11–W12:    [3,    3,      1,      2,     2,      2,      2   ]
//
// Note: "early sets" = total sets - 1 (last set always = 1 for failure/myo/ss).
// Exception: Triceps Pressdown (Bar) earlySetCount=0 when total=1 (myo-reps only).
// DB Concentration Curl earlySetCount=0 when total=1; earlySetCount=1 when total=2.

function rampingUpperA(week: number): WorkoutDay {
  const intro = week === 6;
  const t    = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];

  // early set counts per exercise indexed [InclDB, PecDk, DualPD, HiLat, SmRow, OHCTri, BayCrl]
  const e = intro
    ? [1, 1, 1, 1, 1, 1, 1]
    : week <= 8
    ? [2, 2, 2, 1, 2, 1, 1]
    : week <= 10
    ? [2, 2, 2, 1, 2, 2, 2]
    : [3, 2, 2, 2, 2, 2, 2]; // W11-W12

  return {
    dayType: "upper-a",
    exercises: [
      ex("r-incline-db-press",    "45° Incline DB Press",                        ["45° Incline Barbell Press", "45° Incline Machine Press"],           "chest",    [180, 300], "3-set", [8, 10],  [6, 7], t,    e[0], 1, "1-second pause at the bottom while maintaining tension on the pecs.", intro ? [7, 8] : undefined),
      ex("r-pec-deck",            "Pec Deck",                                    ["Cable Crossover Ladder", "Bottom-Half DB Flye"],                    "chest",    [60, 120],  "2-set", [10, 12], [7, 8], t,    e[1], 1, "Focus on bringing your elbows together — not your hands.", intro ? rpe : undefined),
      ex("r-dual-handle-pulldown","Dual-Handle Lat Pulldown",                    ["Wide-Grip Lat Pulldown", "Wide-Grip Pull-Up"],                      "back",     [120, 180], "2-set", [10, 12], [6, 7], t,    e[2], 1, "Lean back ~15° and drive elbows down — feel like a mix of lats and mid-traps.", intro ? [7, 8] : undefined),
      ex("f-high-cable-lateral-push","High-Cable Lateral Raise",                 ["High-Cable Cuffed Lateral Raise", "Lean-In DB Lateral Raise"],       "shoulders",[60, 120],  "none",  [10, 12], [7, 8], t,    e[3], 1, "Focus on squeezing your lateral delt to move the weight.", intro ? rpe : undefined),
      ex("r-smith-row",           "Smith Machine Row",                           ["Pendlay Deficit Row", "Single-Arm DB Row"],                         "back",     [120, 180], "2-set", [8, 10],  [7, 8], llps, e[4], 1, "Keep elbows at ~45°. Squeeze shoulder blades, control the negative.", intro ? rpe : undefined),
      ex("f-ohc-triceps-bar-push", "Overhead Cable Triceps Extension (Bar)",      ["Overhead Cable Triceps Extension (Rope)", "DB Skull Crusher"],      "triceps",  [60, 120],  "1-set", [10, 12], [7, 8], t,    e[5], 1, "Optionally pause 0.5–1 second in the stretched position.", intro ? rpe : undefined),
      ex("f-bayesian-curl-ua",    "Bayesian Cable Curl",                         ["Bayesian High Cable Curl", "Incline DB Stretch Curl"],               "biceps",   [60, 120],  "1-set", [10, 12], [7, 8], t,    e[6], 1, "If one arm is weaker, train it first — then match reps with the stronger arm.", intro ? rpe : undefined),
    ],
  };
}

function rampingLowerA(week: number): WorkoutDay {
  const intro = week === 6;
  const t    = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const ss   = intro ? ("rpe" as const) : ("static-stretch" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];

  // early set counts: [LyLgCrl, SmLunge, Hyper, LgExt, ClfPrs, MchCrnch]
  const e = intro
    ? [1, 1, 1, 1, 1, 1]
    : week <= 8
    ? [1, 2, 2, 2, 2, 1]
    : week <= 10
    ? [2, 2, 2, 2, 2, 2]
    : [2, 3, 3, 2, 3, 2]; // W11-W12

  return {
    dayType: "lower-a",
    exercises: [
      ex("f-lying-leg-curl",  "Lying Leg Curl",                                  ["Seated Leg Curl", "Nordic Ham Curl"],                               "hamstrings",[60, 120],  "2-set", [10, 12], [7, 8], llps, e[0], 1, "Set machine for maximum stretch. Prevent your butt from popping up as you curl.", intro ? rpe : undefined),
      ex("r-sm-static-lunge", "Smith Machine Static Lunge w/ Elevated Front Foot",["DB Bulgarian Split Squat", "High-Bar Back Squat"],                 "quads",     [180, 300], "4-set", [8, 10],  [6, 7], t,    e[1], 1, "Elevate front foot on a small box. Minimize contribution from the back leg.", intro ? [7, 8] : undefined),
      ex("r-hyperextension",  "45° Hyperextension",                              ["Glute-Ham Raise", "Cable Pull-Through"],                            "hamstrings",[120, 180], "4-set", [8, 10],  [6, 7], t,    e[2], 1, "Squeeze glutes hard at the top. Slow controlled negative, explosive positive.", intro ? [7, 8] : undefined),
      ex("f-leg-ext-la",      "Leg Extension",                                   ["Reverse Nordic", "Sissy Squat"],                                    "quads",     [60, 120],  "2-set", [10, 12], [7, 8], t,    e[3], 1, "Seat all the way back. Grab handles to pull hips down. 2–3 second negative.", intro ? rpe : undefined),
      ex("r-leg-press-calf",  "Leg Press Calf Press",                            ["Seated Calf Raise", "Standing Calf Raise"],                         "calves",    [60, 120],  "2-set", [8, 10],  [7, 8], ss,   e[4], 1, "1–2 second pause at the bottom. Roll your ankle on the balls of your feet.", intro ? rpe : undefined),
      ex("r-machine-crunch",  "Machine Crunch",                                  ["Decline Weighted Crunch", "Cable Crunch"],                          "abs",       [60, 120],  "1-set", [10, 12], [7, 8], t,    e[5], 1, "Round your lower back as you crunch. Mind-muscle connection with your abs.", intro ? rpe : undefined),
    ],
  };
}

function rampingBackBiceps(week: number): WorkoutDay {
  const intro = week === 6;
  const t    = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const myo  = intro ? ("rpe" as const) : ("myo-reps" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];

  // early set counts: [LBPullD, CSTBar, DualRow, RrDlt, CblShrg, RpHmr, DbConc]
  // DB Concentration Curl: earlySetCount is 0 when total=1, 1 when total=2, 2 when total=3
  const e = intro
    ? [1, 1, 1, 1, 1, 1, 0]
    : week <= 8
    ? [2, 2, 1, 2, 1, 2, 1]
    : week <= 10
    ? [2, 2, 2, 2, 2, 2, 1]
    : [2, 3, 2, 2, 2, 2, 2]; // W11-W12

  return {
    dayType: "back-biceps",
    exercises: [
      ex("r-lean-back-pulldown",    "Lean-Back Lat Pulldown",                    ["Lean-Back Machine Pulldown", "Pull-Up"],                            "back",     [120, 180], "3-set", [10, 12], [6, 7], t,    e[0], 1, "Start upright, lean back 15–30° as you pull. Softly touch bar to chest. Control the weight.", intro ? [7, 8] : undefined),
      ex("r-cs-tbar-row",           "Chest-Supported T-Bar Row",                 ["Chest-Supported Machine Row", "Incline Chest-Supported DB Row"],    "back",     [120, 180], "3-set", [10, 12], [6, 7], t,    e[1], 1, "Flare elbows ~45°. Squeeze shoulder blades hard at the top.", intro ? [7, 8] : undefined),
      ex("r-elbows-out-row",        "Dual-Handle Elbows-Out Cable Row",          ["Arm-Out Single-Arm DB Row", "Meadows Row"],                         "back",     [120, 180], "2-set", [12, 15], [7, 8], llps, e[2], 1, "Flare elbows out ~45°. Smooth, controlled reps.", intro ? rpe : undefined),
      ex("f-rear-delt-flye",        "1-Arm 45° Cable Rear Delt Flye",           ["Rope Face Pull", "Reverse Pec Deck"],                               "shoulders",[60, 120],  "2-set", [12, 15], [7, 8], myo,  e[3], 1, "Pause 1–2 seconds in the squeeze. Contract rear delts hard!", intro ? rpe : undefined),
      ex("r-cable-shrug",           "Cable Paused Shrug-In",                     ["Machine Shrug", "DB Shrug"],                                        "back",     [60, 120],  "3-set", [12, 15], [7, 8], t,    e[4], 1, "Shrug up and in — 'up to your ears.' 1–2 second pause at top AND at the bottom.", intro ? rpe : undefined),
      ex("r-rope-hammer-curl",      "Cable Rope Hammer Curl",                    ["DB Hammer Curl", "Hammer Preacher Curl"],                           "biceps",   [60, 120],  "1-set", [12, 15], [7, 8], t,    e[5], 1, "Squeeze the rope hard as you curl up. Smooth, controlled reps.", intro ? rpe : undefined),
      ex("r-db-concentration-curl", "DB Concentration Curl",                     ["Concentration Cable Curl", "DB Preacher Curl"],                     "biceps",   [60, 120],  "1-set", [15, 20], [8, 9], myo,  e[6], 1, "Smooth, controlled reps. Mind-muscle connection with the biceps.", intro ? [8, 9] : undefined),
    ],
  };
}

function rampingPush(week: number): WorkoutDay {
  const intro = week === 6;
  const t    = intro ? ("rpe" as const) : ("failure" as const);
  const myo  = intro ? ("rpe" as const) : ("myo-reps" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];

  // early set counts: [MchChst, DBShldr, BtmFlye, HiLat, EZSkull, TricPD, AbWhl]
  // Triceps Pressdown: earlySetCount=0 → 1 set myo; earlySetCount=1 → 2 sets; earlySetCount=2 → 3 sets
  const e = intro
    ? [1, 1, 1, 1, 1, 0, 1]
    : week <= 8
    ? [2, 2, 1, 2, 1, 1, 1]
    : week <= 10
    ? [2, 2, 2, 2, 1, 2, 2]
    : [3, 2, 2, 2, 2, 2, 2]; // W11-W12

  return {
    dayType: "push",
    exercises: [
      ex("r-machine-chest-press",   "Machine Chest Press",                       ["Barbell Bench Press", "DB Bench Press"],                            "chest",    [180, 300], "4-set", [10, 12], [6, 7], t,   e[0], 1, "1-second pause at the bottom. Maintain tension on the pecs.", intro ? [7, 8] : undefined),
      ex("r-seated-db-shoulder",    "Seated DB Shoulder Press",                  ["Cable Shoulder Press", "Machine Shoulder Press"],                   "shoulders",[120, 180], "3-set", [10, 12], [6, 7], t,   e[1], 1, "Elbows break at least 90°. Mind-muscle connection. Smooth, controlled.", intro ? [7, 8] : undefined),
      ex("r-bottom-half-cable-flye","Bottom-Half Seated Cable Flye",             ["Bottom-Half DB Flye", "Low-to-High Cable Crossover"],               "chest",    [60, 120],  "2-set", [12, 15], [7, 8], t,   e[2], 1, "All reps in the bottom half of ROM. Focus on deep pec stretch at the bottom.", intro ? rpe : undefined),
      ex("f-high-cable-lateral-push","High-Cable Lateral Raise",                 ["High-Cable Cuffed Lateral Raise", "Lean-In DB Lateral Raise"],      "shoulders",[60, 120],  "none",  [12, 15], [7, 8], myo, e[3], 1, "Focus on squeezing your lateral delt to move the weight.", intro ? rpe : undefined),
      ex("r-ez-skull-crusher",      "EZ-Bar Skull Crusher",                      ["DB Skull Crusher", "Katana Triceps Extension"],                     "triceps",  [60, 120],  "1-set", [12, 15], [7, 8], t,   e[4], 1, "Optionally pause 0.5–1 second in the stretched position.", intro ? rpe : undefined),
      ex("r-triceps-pressdown",     "Triceps Pressdown (Bar)",                   ["Triceps Pressdown (Rope)", "DB Triceps Kickback"],                  "triceps",  [60, 120],  "none",  [15, 20], [8, 9], myo, e[5], 1, "Focus on squeezing your triceps to move the weight.", intro ? [8, 9] : undefined),
      ex("r-ab-wheel",              "Ab Wheel Rollout",                          ["Swiss Ball Rollout", "Long-Lever Plank"],                           "abs",      [60, 120],  "2-set", [12, 15], [7, 8], t,   e[6], 1, "Use your abs to lower yourself — don't just bend at the hips. Progressively extend ROM each week.", intro ? rpe : undefined),
    ],
  };
}

function rampingLowerB(week: number): WorkoutDay {
  const intro = week === 6;
  const t    = intro ? ("rpe" as const) : ("failure" as const);
  const llps = intro ? ("rpe" as const) : ("failure+llps" as const);
  const myo  = intro ? ("rpe" as const) : ("myo-reps" as const);
  const ss   = intro ? ("rpe" as const) : ("static-stretch" as const);
  const rpe: [number, number] = intro ? [7, 8] : [8, 9];

  // early set counts: [HkSqt, StLgCrl, WlkLng, LgExt, HipAdd, HipAbd, Calf]
  const e = intro
    ? [1, 1, 1, 1, 1, 1, 1]
    : week <= 8
    ? [2, 2, 1, 1, 1, 1, 1]
    : week <= 10
    ? [2, 2, 1, 2, 2, 2, 2]
    : [3, 3, 1, 2, 2, 2, 2]; // W11-W12

  return {
    dayType: "lower-b",
    exercises: [
      ex("r-hack-squat",     "Hack Squat",           ["Leg Press", "DB Walking Lunge"],                                    "quads",    [120, 180], "4-set", [10, 12], [6, 7], t,    e[0], 1, "Controlled negative — don't free fall — then explode on the positive.", intro ? [7, 8] : undefined),
      ex("f-seated-leg-curl","Seated Leg Curl",        ["Lying Leg Curl", "Nordic Ham Curl"],                               "hamstrings",[60, 120], "2-set", [12, 15], [7, 8], llps, e[1], 1, "Lean forward for maximum hamstring stretch.", intro ? rpe : undefined),
      ex("r-walking-lunge",  "Walking Lunge",         ["Smith Machine Static Lunge", "DB Static Lunge"],                   "quads",    [120, 180], "3-set", [10, 12], [6, 7], t,    e[2], 1, "Medium strides. Minimize contribution from the back leg.", intro ? [7, 8] : undefined),
      ex("f-leg-ext-la",     "Leg Extension",         ["Reverse Nordic", "Sissy Squat"],                                   "quads",    [60, 120],  "2-set", [12, 15], [7, 8], myo,  e[3], 1, "Seat all the way back. Grab handles to pull hips down. 2–3 second negative.", intro ? rpe : undefined),
      ex("f-hip-adduction",  "Machine Hip Adduction", ["Cable Hip Adduction", "Copenhagen Hip Adduction"],                 "hips",     [60, 120],  "2-set", [12, 15], [7, 8], t,    e[4], 1, "Mind-muscle with inner thighs. Great for adding thigh mass from the front!", intro ? rpe : undefined),
      ex("f-hip-abduction",  "Machine Hip Abduction", ["Cable Hip Abduction", "Lateral Band Walk"],                        "hips",     [60, 120],  "2-set", [12, 15], [7, 8], t,    e[5], 1, "Use pads to increase ROM. Lean forward to stretch the glutes.", intro ? rpe : undefined),
      ex("f-standing-calf-la","Standing Calf Raise",  ["Seated Calf Raise", "Leg Press Calf Press"],                       "calves",   [60, 120],  "2-set", [12, 15], [7, 8], ss,   e[6], 1, "1–2 second pause at the bottom. Roll your ankle on the balls of your feet.", intro ? rpe : undefined),
    ],
  };
}

function foundationWeek(week: number, e: number, l: number, intro = false): WeekSchedule {
  return { week, days: [foundationUpperA(e, l, intro), foundationLowerA(e, l, intro), foundationBackBiceps(e, l, intro), foundationPush(e, l, intro), foundationLowerB(e, l, intro)] };
}

function rampingWeek(week: number): WeekSchedule {
  return { week, days: [rampingUpperA(week), rampingLowerA(week), rampingBackBiceps(week), rampingPush(week), rampingLowerB(week)] };
}

export const PROGRAM: WeekSchedule[] = [
  foundationWeek(1, 1, 1, true),
  foundationWeek(2, 2, 1),
  foundationWeek(3, 2, 1),
  foundationWeek(4, 2, 1),
  foundationWeek(5, 2, 1),
  rampingWeek(6),
  rampingWeek(7),
  rampingWeek(8),
  rampingWeek(9),
  rampingWeek(10),
  rampingWeek(11),
  rampingWeek(12),
];
