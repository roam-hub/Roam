"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Screen = "email" | "sent" | "name";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("setup") === "name") {
      setScreen("name");
      return;
    }

    // If Supabase redirects back here with a session (magic link flow),
    // pick it up and navigate to the right screen
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
          const { data: existing } = await supabase
            .from("users")
            .select("name")
            .eq("id", session.user.id)
            .single();

          if (existing?.name) {
            router.push("/trips");
          } else {
            setScreen("name");
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [searchParams, router]);

  async function handleSendLink() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setScreen("sent");
  }

  async function handleSaveName() {
    setError("");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      phone: email,
      name: name.trim(),
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/trips");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* Logo badge */}
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl text-white"
        style={{ background: "var(--ink)", boxShadow: "var(--shadow)" }}
      >
        ✈
      </div>

      {screen === "email" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>
            Roam
          </p>
          <h1 className="mt-1.5 text-center text-5xl leading-[1.08]" style={{ color: "var(--ink)" }}>
            Group trips,<br />sorted.
          </h1>
          <p className="mt-3 max-w-xs text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            Plan it, split it, settle up — all in one place.
          </p>
          <div className="my-10 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
              Your email address
            </label>
            <input
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
            <p className="mt-2 text-center text-[11px]" style={{ color: "var(--ink-soft)" }}>
              We&apos;ll email you a code. No password to forget.
            </p>
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
            <button
              onClick={handleSendLink}
              disabled={loading || !email.includes("@")}
              className="mt-3.5 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}
            >
              {loading ? "Sending…" : "Continue"}
            </button>
          </div>
        </>
      )}

      {screen === "sent" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>
            Check your inbox
          </p>
          <h1 className="mt-1.5 text-center text-5xl leading-[1.08]" style={{ color: "var(--ink)" }}>
            Link sent!
          </h1>
          <p className="mt-3 max-w-xs text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            We sent a sign-in link to <strong>{email}</strong>. Click it and you&apos;re in.
          </p>
          <div className="my-10 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm">
            <button
              onClick={() => { setScreen("email"); setError(""); }}
              className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
              style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}
            >
              Use a different email
            </button>
          </div>
        </>
      )}

      {screen === "name" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>
            Almost in
          </p>
          <h1 className="mt-1.5 text-center text-5xl leading-[1.08]" style={{ color: "var(--ink)" }}>
            What should<br />the crew call you?
          </h1>
          <p className="mt-3 text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            This is the name your friends will see.
          </p>
          <div className="my-10 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
              Your name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
            <button
              onClick={handleSaveName}
              disabled={loading || !name.trim()}
              className="mt-3.5 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}
            >
              {loading ? "Saving…" : "Done"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
