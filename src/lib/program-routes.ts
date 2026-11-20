export const PROGRAMS_PATH = "/programs";

/** A program's read-only preview. */
export function programHref(id: string): string {
  return `${PROGRAMS_PATH}/${encodeURIComponent(id)}`;
}

/** A program's editor; only those who can edit it are sent here. */
export function editProgramHref(id: string): string {
  return `${programHref(id)}/edit`;
}

/** My programs with the "New program" sheet already open. */
export const NEW_PROGRAM_HREF = `${PROGRAMS_PATH}?new=1`;
