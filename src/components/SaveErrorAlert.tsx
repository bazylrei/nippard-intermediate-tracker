interface Props {
  message: string;
  onDismiss: () => void;
}

export default function SaveErrorAlert({ message, onDismiss }: Props) {
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      <span>{message}</span>
      <button onClick={onDismiss} className="shrink-0 font-medium cursor-pointer">
        Dismiss
      </button>
    </div>
  );
}
