import { LogOut } from "lucide-react";

/** The Profile row that signs the person out. */
export default function SignOutRow({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      onClick={onSignOut}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-muted hover:text-fg transition-colors cursor-pointer"
    >
      <LogOut size={18} />
      Sign out
    </button>
  );
}
