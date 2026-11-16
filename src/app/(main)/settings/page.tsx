"use client";

import { useSettings } from "@/hooks/useSettings";
import SettingsPanel from "@/components/program/SettingsPanel";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import FullScreenMessage from "@/components/FullScreenMessage";

export default function SettingsPage() {
  const { status, prefs, bodyWeightKg, saveError, actions } = useSettings();

  if (status === "error") return <FullScreenMessage message="Couldn't load your settings. Check your connection and try again." />;
  if (status === "loading") return <FullScreenMessage message="Loading…" />;

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <h1 className="font-display font-bold text-xl text-fg pt-2">Settings</h1>

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
