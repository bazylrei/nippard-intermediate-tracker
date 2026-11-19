export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-muted text-sm font-display">
      {message}
    </div>
  );
}
