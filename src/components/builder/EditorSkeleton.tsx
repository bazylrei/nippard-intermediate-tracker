/** Placeholder rows while the program editor loads. */
export default function EditorSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-elevated rounded-2xl animate-pulse" />)}
    </div>
  );
}
