import Link from "next/link";
import { SIGN_IN_PATH } from "@/lib/require-user";

/** Shown when a provider's sign-in didn't complete: why, and the way back to sign in. */
export default function SignInFailed({ reason }: { reason: string }) {
  return (
    <div className="w-full min-h-screen max-w-sm mx-auto flex flex-col justify-center gap-5 p-4 text-center">
      <h1 className="font-display text-3xl font-bold text-fg leading-tight">Couldn&apos;t sign you in</h1>
      <p role="alert" className="text-sm text-muted leading-relaxed">{reason}</p>
      <Link href={SIGN_IN_PATH} className="btn-primary gloss font-display font-bold text-lg py-4 rounded-2xl">
        Back to sign in
      </Link>
    </div>
  );
}
