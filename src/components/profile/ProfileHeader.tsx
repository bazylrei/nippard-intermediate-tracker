import { UserRound } from "lucide-react";

/** The Profile screen's title with the signed-in account's email. */
export default function ProfileHeader({ email }: { email: string }) {
  return (
    <header className="flex items-center gap-3 pt-2">
      <div className="w-12 h-12 glass gloss rounded-full flex items-center justify-center">
        <UserRound className="text-primary" size={24} />
      </div>
      <div className="min-w-0">
        <h1 className="font-display font-bold text-xl text-fg leading-tight">Profile</h1>
        <p className="text-sm text-muted truncate">{email}</p>
      </div>
    </header>
  );
}
