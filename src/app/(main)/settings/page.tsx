"use client";

import { useSettings } from "@/hooks/useSettings";
import SettingsPanel from "@/components/program/SettingsPanel";
import SaveErrorAlert from "@/components/widgets/SaveErrorAlert";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import BackToProfile from "@/components/widgets/BackToProfile";

export default function SettingsPage() {
  const { status, prefs, bodyWeightKg, saveError, actions } = useSettings();

  if (status === "error") return <FullScreenMessage message="Couldn't load your settings. Check your connection and try again." />;
  if (status === "loading") return <FullScreenMessage message="Loading…" />;

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <div className="flex items-center gap-2 pt-2">
        <BackToProfile />
        <h1 className="font-display font-bold text-xl text-fg">Settings</h1>
      </div>

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      <SettingsPanel
        prefs={prefs}
        bodyWeightKg={bodyWeightKg}
        onChangeUnit={actions.changeUnit}
        onSaveHeight={actions.saveHeight}
        onLogBodyWeight={actions.logWeight}
        onChangeWeekStart={actions.changeWeekStart}
      />
    </div>
  );
}
