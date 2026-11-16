import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const PROFILE_PATH = "/profile";

/** The back arrow on pages opened from Profile (Program, Programs, Settings). */
export default function BackToProfile() {
  return (
    <Link href={PROFILE_PATH} aria-label="Back to Profile" className="p-2 -ml-2 text-muted hover:text-fg transition-colors rounded-xl">
      <ArrowLeft size={20} />
    </Link>
  );
}
