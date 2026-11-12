/** A centred one-line status for a whole screen: loading, not found, or a load failure. */
export default function FullScreenMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center text-muted text-sm font-display">
      {message}
    </div>
  );
}
