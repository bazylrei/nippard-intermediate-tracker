import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/** A Profile row that opens another page. */
export default function ProfileRow({ href, icon: Icon, title, subtitle }: { href: string; icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-elevated transition-colors">
      <Icon size={18} className="text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">{title}</p>
        <p className="text-xs text-subtle truncate">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-subtle shrink-0" />
    </Link>
  );
}
