"use client";

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
};

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      // Fetch the trip by invite code
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, travel_mode, from_code, from_city, to_code, to_city, dates")
        .eq("invite_code", code)
        .single();

      if (error || !data) { setNotFound(true); return; }
      setTrip(data);

      // If already signed in, add them and redirect immediately
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

  async function handleSendLink() {
    setError("");
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?invite=${code}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) {
      setError(error.message || error.status?.toString() || "Something went wrong — please try again.");
      console.error("Join error:", error);
      return;
    }
    setSent(true);
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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl text-white"
        style={{ background: "var(--ink)", boxShadow: "var(--shadow)" }}>✈</div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}>
        You&apos;re invited
      </p>

      <h1 className="mt-1.5 text-center text-4xl leading-tight" style={{ color: "var(--ink)" }}>
        {trip.name}
      </h1>

      {/* Mini boarding pass */}
      <div className="mt-5 w-full max-w-sm rounded-[18px] border overflow-hidden"
        style={{ borderColor: "var(--line)", boxShadow: "0 8px 22px rgba(27,38,64,.08)" }}>
        <div className="px-5 py-4" style={{ background: "linear-gradient(120deg,var(--ink),#28365c)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-white" style={{ fontFamily: "var(--font-bricolage)" }}>
              {fromLabel}
            </span>
            <span className="h-[5px] w-[5px] rounded-full flex-shrink-0 bg-white opacity-50" />
            <span className="flex-1 h-[2px] opacity-30"
              style={{ background: "repeating-linear-gradient(90deg,#fff,#fff 4px,transparent 4px,transparent 8px)" }} />
            <span className="h-[5px] w-[5px] rounded-full flex-shrink-0 bg-white opacity-50" />
            <span className="text-[15px] font-bold text-white" style={{ fontFamily: "var(--font-bricolage)" }}>
              {toLabel}
            </span>
          </div>
        </div>
        {trip.dates && (
          <div className="px-5 py-3 border-t" style={{ borderColor: "var(--line)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-soft)" }}>Dates</p>
            <p className="text-[15px] font-bold mt-0.5" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
              {trip.dates}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 w-full max-w-sm">
        {sent ? (
          <>
            <p className="text-center font-semibold text-[17px]" style={{ color: "var(--ink)" }}>Check your inbox!</p>
            <p className="mt-2 text-center text-[14px]" style={{ color: "var(--ink-soft)" }}>
              Click the link we sent to <strong>{email}</strong> and you&apos;ll land straight in the trip.
            </p>
          </>
        ) : (
          <>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
              Your email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
            <button
              onClick={handleSendLink}
              disabled={loading || !email.includes("@")}
              className="mt-3.5 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              style={{ background: "var(--coral)" }}
            >
              {loading ? "Sending…" : "Join the trip"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
