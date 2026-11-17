"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSignedInUser, resendConfirmation, sendPasswordReset, signIn, signInWithProvider, signUp } from "@/lib/auth";
import AuthWelcome from "@/components/auth/AuthWelcome";
import CredentialsForm from "@/components/auth/CredentialsForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import EmailSentNotice from "@/components/auth/EmailSentNotice";
import ThemeToggle from "@/components/ThemeToggle";

type View =
  | { name: "welcome" }
  | { name: "signup" }
  | { name: "signin" }
  | { name: "forgot" }
  | { name: "sent"; kind: "confirm" | "reset" };

const HOME = "/";

/** Where a signed-out visitor starts: a welcome, then creating an account or signing in. */
export default function AuthPage() {
  const router = useRouter();
  const [view, setView] = useState<View>({ name: "welcome" });
  const [email, setEmail] = useState("");

  // Someone already signed in has nothing to do here.
  useEffect(() => {
    getSignedInUser().then((user) => { if (user) router.replace(HOME); }).catch((error) => console.error(error));
  }, [router]);

  function enterApp() {
    router.push(HOME);
    router.refresh();
  }

  async function handleSignIn(address: string, password: string) {
    try {
      await signIn(address, password);
    } catch (error) {
      // Not confirmed yet: the way forward is the email, not a second attempt.
      if ((error as { code?: string })?.code === "email_not_confirmed") { setView({ name: "sent", kind: "confirm" }); return; }
      throw error;
    }
    enterApp();
  }

  async function handleSignUp(address: string, password: string) {
    const { confirmationNeeded } = await signUp(address, password);
    if (confirmationNeeded) setView({ name: "sent", kind: "confirm" });
    else enterApp();
  }

  async function handleForgot(address: string) {
    await sendPasswordReset(address);
    setView({ name: "sent", kind: "reset" });
  }

  const showBack = view.name !== "welcome";
  const goBack = () => setView(view.name === "forgot" || view.name === "sent" ? { name: "signin" } : { name: "welcome" });

  return (
    <div className="w-full min-h-screen max-w-sm mx-auto flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between h-10 pt-2">
        {showBack ? (
          <button onClick={goBack} aria-label="Back" className="p-2 -ml-2 text-muted hover:text-fg transition-colors rounded-xl cursor-pointer">
            <ArrowLeft size={20} />
          </button>
        ) : <span className="w-9" />}
        <ThemeToggle />
      </div>

      {view.name === "welcome" && <AuthWelcome onCreate={() => setView({ name: "signup" })} onSignIn={() => setView({ name: "signin" })} />}
      {(view.name === "signup" || view.name === "signin") && (
        <CredentialsForm
          key={view.name}
          mode={view.name}
          email={email}
          onEmailChange={setEmail}
          onSubmit={view.name === "signin" ? handleSignIn : handleSignUp}
          onSocial={signInWithProvider}
          onSwitchMode={() => setView(view.name === "signin" ? { name: "signup" } : { name: "signin" })}
          onForgot={() => setView({ name: "forgot" })}
        />
      )}
      {view.name === "forgot" && <ForgotPasswordForm email={email} onEmailChange={setEmail} onSubmit={handleForgot} />}
      {view.name === "sent" && (
        <EmailSentNotice
          email={email}
          kind={view.kind}
          onResend={() => (view.kind === "confirm" ? resendConfirmation(email) : sendPasswordReset(email))}
          onBack={() => setView({ name: "signin" })}
        />
      )}
    </div>
  );
}
