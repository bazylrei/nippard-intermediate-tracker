/** What decides what someone may do with a program. */
export interface ProgramOwnership {
  createdBy: string | null;
}

/**
 * Whether the user may change the program. Today only its creator can, as the
 * database rules also enforce; this is the one place to widen it (collaborators,
 * subscriptions) so the screens never compare owners themselves.
 */
export function canEditProgram(program: ProgramOwnership, userId: string | null): boolean {
  return !!userId && program.createdBy === userId;
}
