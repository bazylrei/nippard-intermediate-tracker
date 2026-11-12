"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DAY_TYPE_PRESETS } from "./constants";

export default function DayTypeModal({ onSelect, onClose }: { onSelect: (type: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-100 text-sm">Choose day type</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DAY_TYPE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onSelect(preset.value)}
              className="py-2.5 px-2 rounded-xl text-sm bg-zinc-800 text-zinc-300 hover:bg-orange-500/15 hover:text-orange-400 transition-colors leading-tight"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className="py-2.5 px-2 rounded-xl text-sm bg-zinc-800 text-zinc-500 hover:bg-zinc-700 transition-colors"
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
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => custom.trim() && onSelect(custom.trim())}
              disabled={!custom.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
