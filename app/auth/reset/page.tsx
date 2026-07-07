"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase fires onAuthStateChange with SIGNED_IN after the reset link is followed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/trips");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl text-white"
        style={{ background: "var(--ink)", boxShadow: "var(--shadow)" }}
      >✈</div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>Reset password</p>
      <h1 className="mt-1.5 text-center text-4xl leading-tight" style={{ color: "var(--ink)" }}>
        Set a new password
      </h1>
      <p className="mt-3 max-w-xs text-center text-[15px]" style={{ color: "var(--ink-soft)" }}>
        Choose a password you&apos;ll use to sign in going forward.
      </p>

      <div className="my-8 h-px w-16" style={{ background: "var(--line)" }} />

      {!ready ? (
        <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>Verifying link…</p>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>New password</label>
            <input type="password" placeholder="At least 6 characters"
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Confirm password</label>
            <input type="password" placeholder="Same again"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleReset()}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
          </div>
          {error && <p className="text-center text-xs text-red-500">{error}</p>}
          <button onClick={handleReset}
            disabled={loading || !password || !confirm}
            className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--coral)" }}>
            {loading ? "Saving…" : "Save new password"}
          </button>
        </div>
      )}
    </main>
  );
}
