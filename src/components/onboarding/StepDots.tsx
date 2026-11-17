/** Where you are in a few steps, as dots. */
export default function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <div role="img" aria-label={`Step ${current + 1} of ${count}`} className="flex gap-1.5 items-center">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-primary" : "w-1.5"}`}
          style={i === current ? undefined : { background: i < current ? "color-mix(in srgb, var(--primary) 50%, transparent)" : "color-mix(in srgb, var(--fg) 15%, transparent)" }}
        />
      ))}
    </div>
  );
}
