"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Screen = "signin" | "signup" | "forgot" | "forgot-sent" | "name";

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("setup") === "name") {
      setScreen("name");
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/trips");
    });
  }, [searchParams, router]);

  function clearError() { setError(""); }

  async function handleSignIn() {
    clearError();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/trips");
  }

  async function handleSignUp() {
    clearError();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) {
      // Check if they already have a name (existing user signing up again)
      const { data: existing } = await supabase
        .from("users").select("name").eq("id", data.user.id).single();
      if (existing?.name) {
        router.push("/trips");
      } else {
        setScreen("name");
      }
    }
  }

  async function handleForgot() {
    clearError();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setScreen("forgot-sent");
  }

  async function handleSaveName() {
    clearError();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push("/"); return; }
    const { error } = await supabase.from("users").upsert({
      id: session.user.id,
      email: session.user.email,
      name: name.trim(),
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    const after = searchParams.get("after");
    router.push(after ?? "/trips");
  }

  const Logo = () => (
    <div
      className="mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl text-white"
      style={{ background: "var(--ink)", boxShadow: "var(--shadow)" }}
    >✈</div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo />

      {/* ── Sign in ── */}
      {screen === "signin" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>Roam</p>
          <h1 className="mt-1.5 text-center text-5xl leading-[1.08]" style={{ color: "var(--ink)" }}>
            Group trips,<br />made easy.
          </h1>
          <p className="mt-3 max-w-xs text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            Plan it, split it, settle up — all in one place.
          </p>
          <div className="my-8 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Email</label>
              <input type="email" inputMode="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Password</label>
              <input type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()}
                className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
            </div>
            <div className="flex justify-end">
              <button onClick={() => { clearError(); setScreen("forgot"); }}
                className="text-[12px] font-semibold transition hover:opacity-70"
                style={{ color: "var(--ink-soft)" }}>
                Forgot password?
              </button>
            </div>
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <button onClick={handleSignIn}
              disabled={loading || !email.includes("@") || !password}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button onClick={() => { clearError(); setScreen("signup"); }}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
              style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
              Create an account
            </button>
          </div>
        </>
      )}

      {/* ── Sign up ── */}
      {screen === "signup" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>Create account</p>
          <h1 className="mt-1.5 text-center text-4xl leading-tight" style={{ color: "var(--ink)" }}>
            Join Roam
          </h1>
          <div className="my-8 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Email</label>
              <input type="email" inputMode="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Password</label>
              <input type="password" placeholder="At least 6 characters"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignUp()}
                className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
            </div>
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <button onClick={handleSignUp}
              disabled={loading || !email.includes("@") || !password}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
            <button onClick={() => { clearError(); setScreen("signin"); }}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
              style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
              Already have an account? Sign in
            </button>
          </div>
        </>
      )}

      {/* ── Forgot password ── */}
      {screen === "forgot" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>Reset password</p>
          <h1 className="mt-1.5 text-center text-4xl leading-tight" style={{ color: "var(--ink)" }}>
            Forgot your<br />password?
          </h1>
          <p className="mt-3 max-w-xs text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            Enter your email and we&apos;ll send a reset link.
          </p>
          <div className="my-8 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Email</label>
              <input type="email" inputMode="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
            </div>
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <button onClick={handleForgot}
              disabled={loading || !email.includes("@")}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button onClick={() => { clearError(); setScreen("signin"); }}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
              style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
              Back to sign in
            </button>
          </div>
        </>
      )}

      {/* ── Forgot sent ── */}
      {screen === "forgot-sent" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>Check your inbox</p>
          <h1 className="mt-1.5 text-center text-4xl leading-tight" style={{ color: "var(--ink)" }}>
            Reset link sent!
          </h1>
          <p className="mt-3 max-w-xs text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            We sent a password reset link to <strong>{email}</strong>.
          </p>
          <div className="my-8 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm">
            <button onClick={() => { clearError(); setScreen("signin"); }}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
              style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
              Back to sign in
            </button>
          </div>
        </>
      )}

      {/* ── Name setup ── */}
      {screen === "name" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>Almost in</p>
          <h1 className="mt-1.5 text-center text-5xl leading-[1.08]" style={{ color: "var(--ink)" }}>
            What should<br />the crew call you?
          </h1>
          <p className="mt-3 text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            This is the name your friends will see.
          </p>
          <div className="my-8 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Your name</label>
            <input type="text" placeholder="e.g. Alex"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              autoFocus
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
            <button onClick={handleSaveName}
              disabled={loading || !name.trim()}
              className="mt-3.5 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}>
              {loading ? "Saving…" : "Done"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}
