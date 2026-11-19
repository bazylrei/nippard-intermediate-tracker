import { toggleProgramPublic, updateProgram } from "@/lib/db";
import type { EditorContext } from "./context";

/** Fields of a program's own details that the editor can change. */
export type ProgramDetails = { name?: string; description?: string; category?: string };

/** Changes to the program itself: its details and who can see it. */
export function useDetailsActions({ program, change, attempt }: EditorContext) {
  async function togglePublic(): Promise<void> {
    if (!program) return;
    const isPublic = !program.isPublic;
    change((p) => ({ ...p, isPublic })); // shows at once; put back below if saving fails
    const ok = await attempt(() => toggleProgramPublic(program.id, isPublic), "Couldn't change who can see this program. Try again.");
    if (!ok) change((p) => ({ ...p, isPublic: !isPublic }));
  }

  async function updateDetails(fields: ProgramDetails): Promise<boolean> {
    if (!program) return false;
    const ok = await attempt(() => updateProgram(program.id, fields), "Couldn't save the program details. Try again.");
    if (ok) change((p) => ({ ...p, ...fields }));
    return ok;
  }

  return { togglePublic, updateDetails };
}
