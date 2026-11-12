"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { BuilderProgram } from "@/lib/types";

export default function ProgramEditModal({
  program,
  onSave,
  onClose,
}: {
  program: BuilderProgram;
  onSave: (fields: { name: string; description: string; category: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? "");
  const [category, setCategory] = useState(program.category ?? "");
  const [saving, setSaving] = useState(false);

  const CATEGORIES = ["Strength", "Hypertrophy", "Powerlifting", "Conditioning", "Other"];

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description, category });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-100 text-sm">Edit Program</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoCorrect="off"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 resize-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
          >
            <option value="">— None —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? "Saving…" : <><Check size={15} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}
