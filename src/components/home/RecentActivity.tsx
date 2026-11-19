import CompletedWorkoutCell from "@/components/workouts/CompletedWorkoutCell";
import SectionHeading from "@/components/widgets/SectionHeading";
import type { WorkoutFeedItem } from "@/lib/feed";

/** The Home feed of completed workouts, newest first. */
export default function RecentActivity({ items }: { items: WorkoutFeedItem[] }) {
  return (
    <>
      <SectionHeading as="h3" className="px-1 pt-2">Recent activity</SectionHeading>
      {items.length === 0 ? (
        <p className="text-sm text-muted px-1">No workouts yet — your completed sessions will show up here.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => <CompletedWorkoutCell key={item.session.id} item={item} />)}
        </div>
      )}
    </>
  );
}
