"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useWorkoutDetail } from "@/hooks/useWorkoutDetail";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { groupWorkingSets } from "@/lib/workout-history";
import SaveErrorAlert from "@/components/workout/SaveErrorAlert";
import WorkoutDetailHeader from "./WorkoutDetailHeader";
import ExerciseSetsBlock from "./ExerciseSetsBlock";
import AddExerciseForm from "./AddExerciseForm";
import DeleteWorkoutButton from "./DeleteWorkoutButton";

interface Props {
  sessionId: string;
  /** Leave the page — after Back, or once the workout has been deleted. */
  onExit: () => void;
}

function Message({ text }: { text: string }) {
  return <div className="min-h-screen flex items-center justify-center text-muted text-sm font-display px-4 text-center">{text}</div>;
}

export default function WorkoutDetail({ sessionId, onExit }: Props) {
  const { status, session, sets, saveError, actions } = useWorkoutDetail(sessionId);
  const { nameOf, options } = useExerciseCatalog();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  if (status === "loading") return <Message text="Loading…" />;
  if (status === "not-found") return <Message text="This workout doesn't exist or has been deleted." />;
  if (status === "error" || !session) return <Message text="Couldn't load this workout. Check your connection and try again." />;

  const groups = groupWorkingSets(sets);
  const setCount = groups.reduce((n, g) => n + g.sets.length, 0);

  function toggleEdit() {
    setEditing((e) => !e);
    setAdding(false);
  }

  async function deleteWorkout() {
    const ok = await actions.deleteWorkout();
    if (ok) onExit();
    return ok;
  }

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <WorkoutDetailHeader
        session={session}
        exerciseCount={groups.length}
        setCount={setCount}
        editing={editing}
        onToggleEdit={toggleEdit}
        onBack={onExit}
      />

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      {/* Remount on mode change so no row is left half-edited after "Done". */}
      <div key={editing ? "edit" : "view"} className="space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-muted px-1">No sets logged.</p>
        ) : groups.map(({ exerciseId, sets: exerciseSets }) => (
          <ExerciseSetsBlock
            key={exerciseId}
            exerciseId={exerciseId}
            name={nameOf(exerciseId)}
            sets={exerciseSets}
            editing={editing}
            options={options}
            onSwap={(toId) => actions.swapExercise(exerciseId, toId)}
            onRemove={() => actions.removeExercise(exerciseId)}
            onSaveSet={actions.updateSet}
            onDeleteSet={actions.deleteSet}
          />
        ))}
      </div>

      {editing && (
        <>
          {adding ? (
            <AddExerciseForm options={options} onSave={actions.addExercise} onCancel={() => setAdding(false)} />
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl text-sm font-display font-semibold text-muted hover:text-primary border border-dashed border-border transition-colors cursor-pointer">
              <Plus size={15} /> Add exercise
            </button>
          )}
          <DeleteWorkoutButton onDelete={deleteWorkout} />
        </>
      )}
    </div>
  );
}
