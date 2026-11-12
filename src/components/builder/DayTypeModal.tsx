"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DAY_TYPE_PRESETS } from "@/lib/day-types";

export default function DayTypeModal({ onSelect, onClose }: { onSelect: (type: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-fg text-sm">Choose day type</h2>
          <button onClick={onClose} className="text-subtle hover:text-fg"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DAY_TYPE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onSelect(preset.value)}
              className="py-2.5 px-2 rounded-xl text-sm bg-elevated text-muted hover:bg-primary/15 hover:text-primary transition-colors leading-tight"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className="py-2.5 px-2 rounded-xl text-sm bg-elevated text-subtle hover:bg-border transition-colors"
          >
            Custom…
          </button>
        </div>

        {showCustom && (
          <div className="flex gap-2 pt-1">
            <input
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) onSelect(custom.trim()); }}
              placeholder="e.g. Arms, Glutes, HIIT"
              className="flex-1 bg-elevated border border-border rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => custom.trim() && onSelect(custom.trim())}
              disabled={!custom.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-fg hover:opacity-90 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
