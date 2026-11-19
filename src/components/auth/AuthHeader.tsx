import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

/** The sign-in screens' top row: a back arrow once past the welcome, and the theme toggle. */
export default function AuthHeader({ onBack }: { onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between h-10 pt-2">
      {onBack ? (
        <button onClick={onBack} aria-label="Back" className="p-2 -ml-2 text-muted hover:text-fg transition-colors rounded-xl cursor-pointer">
          <ArrowLeft size={20} />
        </button>
      ) : <span className="w-9" />}
      <ThemeToggle />
    </div>
  );
}
