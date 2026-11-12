"use client";

import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, House, ClipboardList, TrendingUp, Wrench } from "lucide-react";

const TABS = [
  { href: "/",         label: "Home",     icon: House         },
  { href: "/program",  label: "Program",  icon: ClipboardList },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/builder",  label: "Builder",  icon: Wrench     },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {/* Desktop: left sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-surface border-r border-border p-4 z-40">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
          <Dumbbell size={22} className="text-primary" />
          <span className="font-display font-bold text-lg text-fg tracking-wide">Nippard</span>
        </div>
        <nav className="flex flex-col gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full cursor-pointer ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-fg hover:bg-elevated"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border flex z-40 safe-bottom">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors cursor-pointer ${
                active ? "text-primary" : "text-subtle hover:text-muted"
              }`}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
