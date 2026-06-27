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

type ItineraryItem = {
  id: string;
  day_number: number;
  time_minutes: number;
  time_label: string;
  description: string;
};

const AVATAR_COLORS = ["#ff6a5a", "#13b6a3", "#6c63ff", "#f4ad3d", "#e2513f"];
const HOURS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00","15","30","45"];

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);

  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [addingItem, setAddingItem] = useState(false);
  const [newHour, setNewHour] = useState("9");
  const [newMinute, setNewMinute] = useState("00");
  const [newPeriod, setNewPeriod] = useState<"AM" | "PM">("AM");
  const [newDesc, setNewDesc] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "budget" | "photos" | "polls" | "crew">("plan");

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

      const { data: itemData } = await supabase
        .from("itinerary_items")
        .select("id, day_number, time_minutes, time_label, description")
        .eq("trip_id", id)
        .order("time_minutes");
      setItems(itemData ?? []);

      setUserId(session.user.id);
    }

    const channel = supabase
      .channel(`itinerary:${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "itinerary_items",
        filter: `trip_id=eq.${id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setItems(prev =>
            [...prev, payload.new as ItineraryItem].sort((a, b) => a.time_minutes - b.time_minutes)
          );
        }
        if (payload.eventType === "DELETE") {
          setItems(prev => prev.filter(i => i.id !== (payload.old as ItineraryItem).id));
        }
      })
      .subscribe();

    load();

    return () => { supabase.removeChannel(channel); };
  }, [id, router]);

  function copyInviteLink() {
    if (!trip) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${trip.invite_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function buildTime(hour: string, minute: string, period: "AM" | "PM") {
    let h = parseInt(hour);
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h !== 12) h += 12;
    return { time_minutes: h * 60 + parseInt(minute), time_label: `${hour}:${minute} ${period}` };
  }

  async function handleAddItem() {
    if (!newDesc.trim() || !userId) return;
    const { time_minutes, time_label } = buildTime(newHour, newMinute, newPeriod);
    await supabase.from("itinerary_items").insert({
      trip_id: id,
      day_number: activeDay,
      time_minutes,
      time_label,
      description: newDesc.trim(),
      created_by: userId,
    });
    setNewDesc("");
    setAddingItem(false);
  }

  async function handleDelete(itemId: string) {
    await supabase.from("itinerary_items").delete().eq("id", itemId);
  }

  if (!trip) return (
    <main className="flex min-h-screen items-center justify-center">
      <p style={{ color: "var(--ink-soft)" }}>Loading…</p>
    </main>
  );

  const fromLabel = trip.travel_mode === "drive" ? (trip.from_city ?? trip.from_code) : trip.from_code;
  const toLabel = trip.travel_mode === "drive" ? (trip.to_city ?? trip.to_code) : trip.to_code;
  const dayItems = items.filter(i => i.day_number === activeDay);

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
        <div className="px-5 py-5" style={{ background: "linear-gradient(120deg,var(--ink),#28365c)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
            style={{ color: "#ffd9c2", fontFamily: "var(--font-bricolage)" }}>
            Roam · Trip pass
          </p>
          <h1 className="text-[21px] text-white mb-3">{trip.name}</h1>
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

      {/* Tab bar */}
      <div className="mt-8 flex overflow-x-auto border-b" style={{ borderColor: "var(--line)" }}>
        {(["plan", "budget", "photos", "polls", "crew"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-shrink-0 px-3 py-2.5 text-[13px] font-semibold capitalize transition"
            style={{
              color: activeTab === tab ? "var(--coral)" : "var(--ink-soft)",
              borderBottom: activeTab === tab ? "2px solid var(--coral)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "plan" && (
        <div className="mt-6">
          {/* Day chips */}
          <div className="flex flex-col gap-2">
            {[1,2,3,4,5,6,7].map(day => (
              <button
                key={day}
                onClick={() => { setActiveDay(day); setAddingItem(false); }}
                className="w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-left transition"
                style={{
                  background: activeDay === day ? "var(--ink)" : "transparent",
                  color: activeDay === day ? "#fff" : "var(--ink-soft)",
                  border: `1.5px solid ${activeDay === day ? "var(--ink)" : "var(--line)"}`,
                }}
              >
                Day {day}
              </button>
            ))}
          </div>

          {/* Items list */}
          <div className="mt-3 flex flex-col gap-2">
            {dayItems.length === 0 && !addingItem && (
              <p className="text-center text-[13px] py-3" style={{ color: "var(--ink-soft)" }}>
                Nothing planned yet.
              </p>
            )}
            {dayItems.map(item => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl px-3.5 py-3"
                style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
              >
                <span
                  className="text-[12px] font-semibold flex-shrink-0 mt-0.5 w-[68px]"
                  style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}
                >
                  {item.time_label}
                </span>
                <span className="flex-1 text-[14px]" style={{ color: "var(--ink)" }}>
                  {item.description}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 text-[18px] leading-none transition hover:opacity-80"
                  style={{ color: "var(--ink-soft)", opacity: 0.35 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add form or button */}
          {addingItem ? (
            <div
              className="mt-3 rounded-[14px] border p-4 flex flex-col gap-3"
              style={{ borderColor: "var(--line)", background: "var(--paper)" }}
            >
              <div className="flex gap-2">
                <select
                  value={newHour}
                  onChange={e => setNewHour(e.target.value)}
                  className="flex-1 rounded-xl border px-2.5 py-2.5 text-[14px] outline-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                >
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select
                  value={newMinute}
                  onChange={e => setNewMinute(e.target.value)}
                  className="flex-1 rounded-xl border px-2.5 py-2.5 text-[14px] outline-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={newPeriod}
                  onChange={e => setNewPeriod(e.target.value as "AM" | "PM")}
                  className="flex-1 rounded-xl border px-2.5 py-2.5 text-[14px] outline-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="e.g. Hike to Clingmans Dome"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddItem()}
                autoFocus
                className="rounded-xl border px-3.5 py-2.5 text-[14px] outline-none w-full"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddItem}
                  disabled={!newDesc.trim()}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: "var(--coral)" }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setAddingItem(false); setNewDesc(""); }}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold transition hover:opacity-70"
                  style={{ border: "1px solid var(--line)", color: "var(--ink-soft)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingItem(true)}
              className="mt-3 w-full rounded-[13px] py-3 text-[14px] font-semibold transition hover:opacity-70"
              style={{ border: "1.5px dashed var(--line)", color: "var(--ink-soft)" }}
            >
              + Add a plan
            </button>
          )}
        </div>
      )}

      {activeTab === "budget" && (
        <div className="mt-8 rounded-2xl border px-5 py-10 text-center"
          style={{ borderColor: "var(--line)", borderStyle: "dashed" }}>
          <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>Budget</p>
        </div>
      )}

      {(activeTab === "photos" || activeTab === "polls" || activeTab === "crew") && (
        <div className="mt-8 rounded-2xl border px-5 py-10 text-center"
          style={{ borderColor: "var(--line)", borderStyle: "dashed" }}>
          <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>Coming soon</p>
        </div>
      )}
    </main>
  );
}
