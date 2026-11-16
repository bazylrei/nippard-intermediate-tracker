import { UsersRound } from "lucide-react";

export default function CommunityPage() {
  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <h1 className="font-display font-bold text-xl text-fg pt-2">Community</h1>
      <div className="glass gloss rounded-2xl px-6 py-12 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <UsersRound className="text-primary" size={28} />
        </div>
        <h2 className="font-display font-bold text-lg text-fg">Coming soon</h2>
        <p className="text-sm text-muted max-w-xs">
          Follow friends, see their workouts and share your own. We&apos;re building it now.
        </p>
      </div>
    </div>
  );
}
