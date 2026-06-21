"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
};

export default function TripsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const [{ data: userData }, { data: memberRows }] = await Promise.all([
        supabase.from("users").select("name").eq("id", user.id).single(),
        supabase.from("trip_members").select("trip_id").eq("user_id", user.id),
      ]);

      setUserName(userData?.name ?? "");

      if (memberRows && memberRows.length > 0) {
        const tripIds = memberRows.map(r => r.trip_id);
        const { data: tripData } = await supabase
          .from("trips")
          .select("id, name, travel_mode, from_code, from_city, to_code, to_city, dates, budget")
          .in("id", tripIds)
          .order("created_at", { ascending: false });
        setTrips(tripData ?? []);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="flex min-h-screen flex-col px-4 py-10 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--ink-soft)" }}>
            Hi {userName || "there"} 👋
          </p>
          <h1 className="text-[26px]" style={{ color: "var(--ink)" }}>Your trips</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition hover:opacity-70"
          style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}
        >
          Sign out
        </button>
      </div>

      {/* Trip list or empty state */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>Loading…</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center gap-2"
          style={{ color: "var(--ink-soft)" }}>
          <div className="text-5xl">🧳</div>
          <p className="font-medium">No trips yet.</p>
          <p className="text-[13px] max-w-[200px]">Start one and pull your crew in.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          {trips.map(trip => (
            <div
              key={trip.id}
              className="overflow-hidden rounded-[18px] border cursor-pointer transition hover:shadow-md"
              style={{ borderColor: "var(--line)", background: "var(--paper)", boxShadow: "0 8px 22px rgba(27,38,64,.08)" }}
              onClick={() => router.push(`/trips/${trip.id}`)}
            >
              {/* Coral top band */}
              <div className="h-[5px]" style={{ background: "var(--coral)" }} />
              <div className="px-4 py-3">
                {trip.dates && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] mb-1"
                    style={{ color: "var(--ink-soft)" }}>
                    {trip.dates}
                  </p>
                )}
                <h3 className="text-[17px] mb-2" style={{ color: "var(--ink)" }}>{trip.name}</h3>
                {/* Route row */}
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
                    {trip.travel_mode === "drive" ? (trip.from_city ?? trip.from_code) : trip.from_code}
                  </span>
                  <span className="h-[6px] w-[6px] rounded-full flex-shrink-0" style={{ background: "var(--amber)" }} />
                  <span className="flex-1 h-[2px]"
                    style={{ background: "repeating-linear-gradient(90deg,var(--line),var(--line) 4px,transparent 4px,transparent 8px)" }} />
                  <span className="h-[6px] w-[6px] rounded-full flex-shrink-0" style={{ background: "var(--amber)" }} />
                  <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
                    {trip.travel_mode === "drive" ? (trip.to_city ?? trip.to_code) : trip.to_code}
                  </span>
                </div>
                {/* Mode indicator */}
                <p className="mt-1.5 text-[10px]" style={{ color: "var(--ink-soft)" }}>
                  {trip.travel_mode === "drive" ? "🚗 Road trip" : "✈ Flying"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => router.push("/trips/new")}
        className="mt-6 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
        style={{ background: "var(--coral)" }}
      >
        {trips.length > 0 ? "+ New trip" : "Start a trip"}
      </button>
    </main>
  );
}
