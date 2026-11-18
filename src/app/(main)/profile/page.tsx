"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requireSignedInUser, SIGN_IN_PATH } from "@/lib/require-user";
import { ACTIVE_PROGRAM_NAME } from "@/lib/program-db";
import { getTotalSessions } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import { useSaveError } from "@/hooks/useSaveError";
import { ChevronRight, ClipboardList, Dumbbell, LibraryBig, LogOut, Settings, UserRound, type LucideIcon } from "lucide-react";
import { EXERCISES_PATH } from "@/lib/exercise-routes";
import { PROGRAMS_PATH } from "@/lib/program-routes";

export default function ProfilePage() {
  const router = useRouter();
  const { program } = useProgramContext();
  const [email, setEmail] = useState("");
  const saveError = useSaveError();

  // Only the email comes from the session (stored locally, no round trip), so the page renders straight away.
  useEffect(() => {
    requireSignedInUser(router).then((user) => setEmail(user?.email ?? ""));
  }, [router]);

  async function handleSignOut() {
    if (await saveError.attempt(signOut, "Couldn't sign out. Try again.")) router.replace(SIGN_IN_PATH);
  }

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <header className="flex items-center gap-3 pt-2">
        <div className="w-12 h-12 glass gloss rounded-full flex items-center justify-center">
          <UserRound className="text-primary" size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl text-fg leading-tight">Profile</h1>
          <p className="text-sm text-muted truncate">{email}</p>
        </div>
      </header>

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      <Section title="Current program">
        <Row
          href="/program"
          icon={ClipboardList}
          title={ACTIVE_PROGRAM_NAME}
          subtitle={`${program.length} weeks · ${getTotalSessions(program)} workouts`}
        />
      </Section>

      <Section title="Programs & exercises">
        <Row href={PROGRAMS_PATH} icon={LibraryBig} title="My programs" subtitle="Yours and shared with you · preview and edit" />
        <Row href={EXERCISES_PATH} icon={Dumbbell} title="Exercises" subtitle="Browse every exercise and add your own" />
      </Section>

      <Section title="Account">
        <Row href="/settings" icon={Settings} title="Settings" subtitle="Units, theme, week start, body stats" />
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-muted hover:text-fg transition-colors cursor-pointer"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display font-bold text-xs uppercase tracking-widest text-muted px-1">{title}</h2>
      <div className="glass gloss rounded-2xl divide-y divide-border overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ href, icon: Icon, title, subtitle }: { href: string; icon: LucideIcon; title: string; subtitle: string }) {
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
