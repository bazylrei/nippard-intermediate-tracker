interface ErrorLike {
  message: string;
  code?: string;
}

type AnyResult = { data: unknown; error: ErrorLike | null };

/** The `data` type of the success branch of a Supabase response union. */
type SuccessData<R extends AnyResult> = Extract<R, { error: null }>["data"];

export class DbError extends Error {
  readonly code?: string;

  constructor(operation: string, cause: ErrorLike) {
    super(`${operation} failed: ${cause.message}`);
    this.name = "DbError";
    this.code = cause.code;
  }
}

/** Fail fast: throw on any Supabase error instead of letting callers carry on as if it succeeded. */
export function unwrap<R extends AnyResult>(operation: string, result: R): SuccessData<R> {
  if (result.error) throw new DbError(operation, result.error);
  return result.data as SuccessData<R>;
}
