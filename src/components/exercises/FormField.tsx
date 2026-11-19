/** A labelled form control with its validation message underneath. */
export default function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-muted mb-1.5">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
