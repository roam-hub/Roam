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
  budget: number | null;
  invite_code: string;
};

type Member = { name: string | null };

const AVATAR_COLORS = ["#ff6a5a", "#13b6a3", "#6c63ff", "#f4ad3d", "#e2513f"];

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const { data: tripData } = await supabase
        .from("trips")
        .select("id, name, travel_mode, from_code, from_city, to_code, to_city, dates, budget, invite_code")
        .eq("id", id)
        .single();

      if (!tripData) { router.push("/trips"); return; }
      setTrip(tripData);

      // Load members
      const { data: memberRows } = await supabase
        .from("trip_members")
        .select("user_id")
        .eq("trip_id", id);

      if (memberRows && memberRows.length > 0) {
        const userIds = memberRows.map(r => r.user_id);
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .in("id", userIds);
        setMembers(userData ?? []);
      }
    }
    load();
  }, [id, router]);

  function copyInviteLink() {
    if (!trip) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${trip.invite_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!trip) return (
    <main className="flex min-h-screen items-center justify-center">
      <p style={{ color: "var(--ink-soft)" }}>Loading…</p>
    </main>
  );

  const fromLabel = trip.travel_mode === "drive" ? (trip.from_city ?? trip.from_code) : trip.from_code;
  const toLabel = trip.travel_mode === "drive" ? (trip.to_city ?? trip.to_code) : trip.to_code;

  return (
    <main className="flex min-h-screen flex-col px-4 py-10 max-w-sm mx-auto">
      <button
        onClick={() => router.push("/trips")}
        className="mb-6 flex items-center gap-1.5 text-[13px] font-semibold transition hover:opacity-70"
        style={{ color: "var(--ink-soft)" }}
      >
        ← Your trips
      </button>

      {/* Boarding pass card */}
      <div className="rounded-[18px] overflow-hidden border" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow)" }}>
        {/* Dark header */}
        <div className="px-5 py-5" style={{ background: "linear-gradient(120deg,var(--ink),#28365c)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
            style={{ color: "#ffd9c2", fontFamily: "var(--font-bricolage)" }}>
            Roam · Trip pass
          </p>
          <h1 className="text-[21px] text-white mb-3">{trip.name}</h1>

          {/* Route */}
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white" style={{ fontFamily: "var(--font-bricolage)" }}>
              {fromLabel}
            </span>
            <span className="h-[5px] w-[5px] rounded-full flex-shrink-0 bg-white opacity-50" />
            <span className="flex-1 h-[2px] opacity-30"
              style={{ background: "repeating-linear-gradient(90deg,#fff,#fff 4px,transparent 4px,transparent 8px)" }} />
            <span className="h-[5px] w-[5px] rounded-full flex-shrink-0 bg-white opacity-50" />
            <span className="text-[14px] font-bold text-white" style={{ fontFamily: "var(--font-bricolage)" }}>
              {toLabel}
            </span>
          </div>

          {/* Crew avatars */}
          {members.length > 0 && (
            <div className="flex items-center mt-4">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white border-2"
                  style={{
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    borderColor: "#1b2640",
                    marginLeft: i === 0 ? 0 : -8,
                    fontFamily: "var(--font-bricolage)",
                  }}
                >
                  {(m.name ?? "?")[0].toUpperCase()}
                </div>
              ))}
              <span className="ml-2.5 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                {members.length} on the trip
              </span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex justify-between px-5 py-3 border-t" style={{ borderColor: "var(--line)" }}>
          {trip.dates && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-soft)" }}>Dates</p>
              <p className="text-[15px] font-bold mt-0.5" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
                {trip.dates}
              </p>
            </div>
          )}
          {trip.budget && (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-soft)" }}>Budget</p>
              <p className="text-[15px] font-bold mt-0.5" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
                ${trip.budget.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invite section */}
      <div className="mt-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: "var(--ink-soft)" }}>
          Invite your crew
        </p>
        <div
          className="rounded-xl border px-3.5 py-3 text-[12px] break-all mb-3"
          style={{ borderColor: "var(--line)", borderStyle: "dashed", color: "var(--ink-soft)" }}
        >
          {typeof window !== "undefined" ? `${window.location.origin}/join/${trip.invite_code}` : `/join/${trip.invite_code}`}
        </div>
        <button
          onClick={copyInviteLink}
          className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: copied ? "var(--good)" : "var(--coral)" }}
        >
          {copied ? "✓ Link copied!" : "Copy invite link"}
        </button>
      </div>
    </main>
  );
}
