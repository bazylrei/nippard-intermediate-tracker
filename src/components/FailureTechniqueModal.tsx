"use client";

import { X } from "lucide-react";
import type { FailureTechnique } from "@/lib/types";
import { useProgramContext } from "@/context/ProgramContext";

interface Props {
  technique: FailureTechnique;
  onClose: () => void;
}

export default function FailureTechniqueModal({ technique, onClose }: Props) {
  const { failureTechniques } = useProgramContext();
  const info = failureTechniques[technique];
  if (!info) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-primary">{info.label}</h3>
          <button onClick={onClose} className="text-subtle hover:text-fg mt-0.5">
            <X size={18} />
          </button>
        </div>
        <p className="text-muted text-sm leading-relaxed">{info.description}</p>
        <button
          onClick={onClose}
          className="w-full bg-primary hover:opacity-90 text-primary-fg font-medium py-3 rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
