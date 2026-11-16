import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const PROFILE_PATH = "/profile";

/** A page header's back arrow to the page it was opened from. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="p-2 -ml-2 text-muted hover:text-fg transition-colors rounded-xl">
      <ArrowLeft size={20} />
    </Link>
  );
}

/** The back arrow on pages opened from Profile (Program, Programs, Exercises, Settings). */
export default function BackToProfile() {
  return <BackLink href={PROFILE_PATH} label="Back to Profile" />;
}
