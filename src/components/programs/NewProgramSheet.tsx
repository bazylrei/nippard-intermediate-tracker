"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PROGRAM_CATEGORIES } from "@/components/builder/constants";
import { newProgramId, type NewProgramFields } from "@/lib/db";

interface Props {
  /** Creates the program under the given id (made once per sheet, so a retry can't add a second). Rejects if saving fails. */
  onCreate: (id: string, fields: NewProgramFields) => Promise<void>;
  onClose: () => void;
}

const fieldClass = "w-full rounded-xl px-3 py-2.5 text-sm text-fg bg-elevated border border-border focus:outline-none focus:border-primary";

/** Name a new program; it's then built in the editor. Stays open with an error if it can't be created. */
export default function NewProgramSheet({ onCreate, onClose }: Props) {
  const [id] = useState(newProgramId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length > 0 && !creating;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(id, { name, description, category });
    } catch (err) {
      console.error(err);
      setError("Couldn't create the program. Try again.");
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 60%, transparent)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !creating) onClose(); }}
    >
      <form
        onSubmit={create}
        aria-label="New program"
        className="w-full max-w-lg glass-strong gloss rounded-t-3xl p-6 space-y-4"
        style={{ boxShadow: "0 -4px 40px color-mix(in srgb, var(--bg) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--fg) 8%, transparent)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-display font-semibold">New program</p>
            <h3 className="font-display font-bold text-xl text-fg leading-tight">Name your program</h3>
          </div>
          <button type="button" onClick={onClose} disabled={creating} aria-label="Close" className="text-subtle hover:text-fg transition-colors cursor-pointer p-1 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-subtle">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus autoCorrect="off" className={fieldClass} />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-subtle">Description (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${fieldClass} resize-none`} />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-subtle">Category (optional)</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
            <option value="">— None —</option>
            {PROGRAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <p className="text-xs text-muted">It starts private, with one empty week to build in the editor.</p>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-muted cursor-pointer"
            style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
          >
            Cancel
          </button>
          <button type="submit" disabled={!ready} className="btn-primary flex-1 gloss font-display font-bold py-3 rounded-xl text-sm disabled:opacity-50">
            {creating ? "Creating…" : "Create program"}
          </button>
        </div>
      </form>
    </div>
  );
}
