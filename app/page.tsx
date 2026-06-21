"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Screen = "email" | "otp" | "name";

export default function Home() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setScreen("otp");
  }

  async function handleVerifyOtp() {
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) { setError(error.message); return; }

    const userId = data.user?.id;
    if (!userId) return;

    const { data: existing } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();

    if (existing?.name) {
      router.push("/trips");
    } else {
      setScreen("name");
    }
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
              onClick={handleSendOtp}
              disabled={loading || !email.includes("@")}
              className="mt-3.5 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}
            >
              {loading ? "Sending…" : "Continue"}
            </button>
          </div>
        </>
      )}

      {screen === "otp" && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>
            Verify
          </p>
          <h1 className="mt-1.5 text-center text-5xl leading-[1.08]" style={{ color: "var(--ink)" }}>
            Enter the code
          </h1>
          <p className="mt-3 text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
            Sent to {email}
          </p>
          <div className="my-10 h-px w-16" style={{ background: "var(--line)" }} />
          <div className="w-full max-w-sm">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
              6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border px-3.5 py-3 text-center text-[22px] font-bold tracking-[0.5em] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", fontFamily: "var(--font-bricolage)" }}
            />
            <p className="mt-2 text-center text-[11px]" style={{ color: "var(--ink-soft)" }}>
              Check your inbox — the code expires in 10 minutes.
            </p>
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="mt-3.5 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--coral)" }}
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button
              onClick={() => { setScreen("email"); setError(""); setOtp(""); }}
              className="mt-2 w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
              style={{ color: "var(--ink-soft)" }}
            >
              Back
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
