"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requireSignedInUser, SIGN_IN_PATH } from "@/lib/require-user";
import { ACTIVE_PROGRAM_NAME } from "@/lib/program-db";
import { getTotalSessions } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import SaveErrorAlert from "@/components/widgets/SaveErrorAlert";
import { useSaveError } from "@/hooks/useSaveError";
import { ClipboardList, Dumbbell, LibraryBig, Settings } from "lucide-react";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSection from "@/components/profile/ProfileSection";
import ProfileRow from "@/components/profile/ProfileRow";
import SignOutRow from "@/components/profile/SignOutRow";
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
      <ProfileHeader email={email} />

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      <ProfileSection title="Current program">
        <ProfileRow
          href="/program"
          icon={ClipboardList}
          title={ACTIVE_PROGRAM_NAME}
          subtitle={`${program.length} weeks · ${getTotalSessions(program)} workouts`}
        />
      </ProfileSection>

      <ProfileSection title="Programs & exercises">
        <ProfileRow href={PROGRAMS_PATH} icon={LibraryBig} title="My programs" subtitle="Yours and shared with you · preview and edit" />
        <ProfileRow href={EXERCISES_PATH} icon={Dumbbell} title="Exercises" subtitle="Browse every exercise and add your own" />
      </ProfileSection>

      <ProfileSection title="Account">
        <ProfileRow href="/settings" icon={Settings} title="Settings" subtitle="Units, theme, week start, body stats" />
        <SignOutRow onSignOut={handleSignOut} />
      </ProfileSection>
    </div>
  );
}
