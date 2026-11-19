import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** A page header's back arrow to the page it was opened from. */
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="p-2 -ml-2 text-muted hover:text-fg transition-colors rounded-xl">
      <ArrowLeft size={20} />
    </Link>
  );
}
