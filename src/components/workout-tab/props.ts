/** What the centre and sidebar workout tabs share. */
export interface WorkoutTabProps {
  /** No workout in progress: the tab offers to start the next one, with no clock. */
  idle: boolean;
  /** When the workout began; without it (older saved data) only the rest countdown can show. */
  startedAt?: string;
  active: boolean;
  onSelect: () => void;
}
