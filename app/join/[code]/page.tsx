"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  name: string;
  travel_mode: string | null;
  from_code: string;
  from_city: string | null;
  to_code: string;
  to_city: string | null;
  dates: string | null;
  created_by: string | null;
};

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [screen, setScreen] = useState<"auth" | "name">("auth");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, travel_mode, from_code, from_city, to_code, to_city, dates, created_by")
        .eq("invite_code", code)
        .single();

      if (error || !data) { setNotFound(true); return; }
      setTrip(data);

      if (data.created_by) {
        const { data: creator } = await supabase
          .from("users").select("name").eq("id", data.created_by).single();
        if (creator?.name) setInviterName(creator.name);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("trip_members").upsert(
          { trip_id: data.id, user_id: session.user.id },
          { onConflict: "trip_id,user_id" }
        );
        router.push(`/trips/${data.id}`);
      }
    }
    load();
  }, [code, router]);

  async function joinTrip(userId: string) {
    if (!trip) return;
    await supabase.from("trip_members").upsert(
      { trip_id: trip.id, user_id: userId },
      { onConflict: "trip_id,user_id" }
    );
    router.push(`/trips/${trip.id}`);
  }

  async function handleSignIn() {
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) await joinTrip(data.user.id);
  }

  async function handleSignUp() {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) {
      const { data: existing } = await supabase
        .from("users").select("name").eq("id", data.user.id).single();
      if (existing?.name) {
        await joinTrip(data.user.id);
      } else {
        setScreen("name");
      }
    }
  }

  async function handleSaveName() {
    setError("");
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("users").upsert({
      id: session.user.id,
      email: session.user.email,
      name: name.trim(),
    });
    setLoading(false);
    await joinTrip(session.user.id);
  }

  const fromLabel = trip?.travel_mode === "drive" ? (trip.from_city ?? trip?.from_code) : trip?.from_code;
  const toLabel = trip?.travel_mode === "drive" ? (trip.to_city ?? trip?.to_code) : trip?.to_code;

  if (notFound) return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl text-white"
        style={{ background: "var(--ink)", boxShadow: "var(--shadow)" }}>✈</div>
      <h1 className="mt-2 text-2xl text-center" style={{ color: "var(--ink)" }}>Link not found</h1>
      <p className="mt-2 text-[14px] text-center" style={{ color: "var(--ink-soft)" }}>
        This invite link may have expired or been removed.
      </p>
    </main>
  );

  if (!trip) return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <p style={{ color: "var(--ink-soft)" }}>Loading…</p>
    </main>
  );

  return (
    <main className="flex min-h-screen flex-col px-4 py-14 max-w-sm mx-auto">

      {/* Invite header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-2"
          style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>
          {inviterName ? `${inviterName} invited you` : "You're invited"}
        </p>
        <h1 className="text-[36px] font-bold leading-[1.05]" style={{ color: "var(--ink)" }}>
          {trip.name}
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
          Join the trip to see the plan, split costs, and vote on ideas.
        </p>
      </div>

      {/* Boarding pass card */}
      <div className="rounded-[18px] overflow-hidden border mb-8"
        style={{ borderColor: "var(--line)", boxShadow: "0 8px 22px rgba(27,38,64,.08)" }}>
        <div className="px-5 py-5" style={{ background: "linear-gradient(120deg,var(--ink),#28365c)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: "#ffd9c2", fontFamily: "var(--font-bricolage)" }}>
            Roam · Trip pass
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-white" style={{ fontFamily: "var(--font-bricolage)" }}>
              {fromLabel}
            </span>
            <span className="h-[5px] w-[5px] rounded-full flex-shrink-0 bg-white opacity-50" />
            <span className="flex-1 h-[2px] opacity-30"
              style={{ background: "repeating-linear-gradient(90deg,#fff,#fff 4px,transparent 4px,transparent 8px)" }} />
            <span className="text-white opacity-60 text-[18px]">✈</span>
            <span className="flex-1 h-[2px] opacity-30"
              style={{ background: "repeating-linear-gradient(90deg,#fff,#fff 4px,transparent 4px,transparent 8px)" }} />
            <span className="h-[5px] w-[5px] rounded-full flex-shrink-0 bg-white opacity-50" />
            <span className="text-[17px] font-bold text-white" style={{ fontFamily: "var(--font-bricolage)" }}>
              {toLabel}
            </span>
          </div>
        </div>
        {trip.dates && (
          <div className="px-5 py-3 border-t" style={{ borderColor: "var(--line)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-soft)" }}>Dates</p>
            <p className="text-[15px] font-bold mt-0.5" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
              {trip.dates}
            </p>
          </div>
        )}
      </div>

      {/* Auth / name form */}
      {screen === "name" ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-center font-semibold" style={{ color: "var(--ink)" }}>
            One last thing — what should the crew call you?
          </p>
          <input type="text" placeholder="e.g. Alex"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSaveName()}
            autoFocus
            className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
          {error && <p className="text-center text-xs text-red-500">{error}</p>}
          <button onClick={handleSaveName}
            disabled={loading || !name.trim()}
            className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: "var(--coral)" }}>
            {loading ? "Joining…" : "Join the trip →"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Sign in / Sign up toggle */}
          <div className="flex gap-2 mb-1">
            <button
              onClick={() => { setAuthMode("signup"); setError(""); }}
              className="flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition"
              style={{
                background: authMode === "signup" ? "var(--coral)" : "transparent",
                color: authMode === "signup" ? "white" : "var(--ink-soft)",
                border: authMode === "signup" ? "none" : "1px solid var(--line)",
              }}>
              New to Roam
            </button>
            <button
              onClick={() => { setAuthMode("signin"); setError(""); }}
              className="flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition"
              style={{
                background: authMode === "signin" ? "var(--coral)" : "transparent",
                color: authMode === "signin" ? "white" : "var(--ink-soft)",
                border: authMode === "signin" ? "none" : "1px solid var(--line)",
              }}>
              I have an account
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Email</label>
            <input type="email" inputMode="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>Password</label>
            <input type="password"
              placeholder={authMode === "signup" ? "At least 6 characters" : "••••••••"}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (authMode === "signin" ? handleSignIn() : handleSignUp())}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
          </div>
          {error && <p className="text-center text-xs text-red-500">{error}</p>}
          <button
            onClick={authMode === "signin" ? handleSignIn : handleSignUp}
            disabled={loading || !email.includes("@") || !password}
            className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: "var(--coral)" }}>
            {loading ? "Joining…" : "Join the trip →"}
          </button>
        </div>
      )}
    </main>
  );
}
