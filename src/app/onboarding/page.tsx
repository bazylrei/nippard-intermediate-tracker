"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { programRun } from "@/lib/program-data";
import { NEW_PROGRAM_HREF } from "@/lib/program-routes";
import { startWorkoutHref } from "@/lib/workout-history";
import { useProgramContext } from "@/context/ProgramContext";
import { ONBOARDING_STEPS, useOnboarding } from "@/hooks/useOnboarding";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import SaveErrorAlert from "@/components/widgets/SaveErrorAlert";
import StepDots from "@/components/onboarding/StepDots";
import UnitsStep from "@/components/onboarding/UnitsStep";
import BodyWeightStep from "@/components/onboarding/BodyWeightStep";
import ProgramStep from "@/components/onboarding/ProgramStep";

export default function OnboardingPage() {
  const router = useRouter();
  const { followProgram } = useProgramContext();
  const flow = useOnboarding();

  if (flow.status === "error") return <FullScreenMessage message="Couldn't load. Check your connection and try again." />;
  if (flow.status === "loading") return <FullScreenMessage message="Loading…" />;

  /** Finishes onboarding and goes on; stays here, with the error shown, if finishing fails. */
  async function finishAnd(destination: string) {
    if (await flow.finish()) router.push(destination);
  }

  /** Follows the chosen program (or none), then opens its first workout — or Home, following none. */
  async function choose(programId: string | null) {
    let schedule: Awaited<ReturnType<typeof followProgram>> = [];
    const followed = await flow.saveError.attempt(async () => {
      schedule = await followProgram(programId);
    }, "Couldn't save your program. Try again.");
    if (!followed) return;
    const first = programRun([], schedule).next;
    await finishAnd(first ? startWorkoutHref(first) : "/");
  }

  return (
    <div className="w-full min-h-screen max-w-lg mx-auto flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between pt-2 h-10">
        {flow.step === "weight" ? (
          <button onClick={flow.back} aria-label="Back" className="p-2 -ml-2 text-muted hover:text-fg transition-colors rounded-xl cursor-pointer">
            <ArrowLeft size={20} />
          </button>
        ) : <span className="w-9" />}
        <StepDots count={ONBOARDING_STEPS.length} current={flow.stepIndex} />
        <span className="w-9" />
      </div>

      {flow.saveError.message && <SaveErrorAlert message={flow.saveError.message} onDismiss={flow.saveError.clear} />}

      {flow.step === "units" && (
        <UnitsStep
          unit={flow.unit}
          weekStartsOn={flow.weekStartsOn}
          onChangeUnit={flow.setUnit}
          onChangeWeekStart={flow.setWeekStartsOn}
          onNext={flow.saveUnits}
        />
      )}
      {flow.step === "weight" && <BodyWeightStep unit={flow.unit} onSave={flow.saveBodyWeight} onSkip={flow.next} />}
      {flow.step === "program" && (
        <ProgramStep programs={flow.programs} onChoose={choose} onBuild={() => finishAnd(NEW_PROGRAM_HREF)} />
      )}
    </div>
  );
}
