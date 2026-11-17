import { ClipboardList, Dumbbell, TrendingUp, type LucideIcon } from "lucide-react";

const POINTS: { icon: LucideIcon; text: string }[] = [
  { icon: Dumbbell, text: "Log each set as you train" },
  { icon: TrendingUp, text: "See your progress and volume" },
  { icon: ClipboardList, text: "Follow a program, or build your own" },
];

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col justify-center gap-8">
      <div className="space-y-3 text-center">
        <div className="w-20 h-20 glass gloss rounded-full flex items-center justify-center mx-auto"
          style={{ boxShadow: "0 0 40px color-mix(in srgb, var(--primary) 25%, transparent)" }}>
          <Dumbbell size={36} className="text-primary" />
        </div>
        <h1 className="font-display text-4xl font-bold text-fg leading-tight">Welcome</h1>
        <p className="text-muted">Two quick questions and you&apos;re ready to train.</p>
      </div>

      <ul className="glass gloss rounded-2xl p-4 space-y-3">
        {POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm text-fg">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
              <Icon size={16} className="text-primary" />
            </span>
            {text}
          </li>
        ))}
      </ul>

      <button onClick={onNext} className="btn-primary gloss w-full font-display font-bold text-lg py-4 rounded-2xl cursor-pointer">
        Get started
      </button>
    </div>
  );
}
