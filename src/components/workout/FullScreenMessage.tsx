export default function FullScreenMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-muted text-sm">{message}</div>
    </div>
  );
}
