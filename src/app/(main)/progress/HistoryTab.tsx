import type { WorkoutFeedItem } from "@/lib/feed";
import CompletedWorkoutCell from "@/components/workouts/CompletedWorkoutCell";
import EmptyState from "./EmptyState";

interface Props {
  items: WorkoutFeedItem[];
  loaded: boolean;
  failed: boolean;
}

export default function HistoryTab({ items, loaded, failed }: Props) {
  if (!loaded) {
    return <div className="text-center py-16 text-muted text-sm font-display">Loading history…</div>;
  }
  if (failed) {
    return <EmptyState message="Couldn't load your history. Check your connection and try again." />;
  }
  if (items.length === 0) {
    return <EmptyState message="No completed workouts yet." />;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => <CompletedWorkoutCell key={item.session.id} item={item} />)}
    </div>
  );
}
