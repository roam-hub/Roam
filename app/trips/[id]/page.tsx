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

type Member = { id: string; name: string | null };

type ItineraryItem = {
  id: string;
  day_number: number;
  time_minutes: number;
  time_label: string;
  description: string;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
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

  // itinerary state
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [addingItem, setAddingItem] = useState(false);
  const [newHour, setNewHour] = useState("9");
  const [newMinute, setNewMinute] = useState("00");
  const [newPeriod, setNewPeriod] = useState<"AM" | "PM">("AM");
  const [newDesc, setNewDesc] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "budget" | "photos" | "polls" | "crew">("plan");

  // budget state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [addingExpense, setAddingExpense] = useState(false);
  const [newExpDesc, setNewExpDesc] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpPaidBy, setNewExpPaidBy] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState("");

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
          .select("id, name")
          .in("id", userIds);
        setMembers(userData ?? []);
      }

      const { data: itemData } = await supabase
        .from("itinerary_items")
        .select("id, day_number, time_minutes, time_label, description")
        .eq("trip_id", id)
        .order("time_minutes");
      setItems(itemData ?? []);

      const { data: expenseData } = await supabase
        .from("expenses")
        .select("id, description, amount, paid_by")
        .eq("trip_id", id)
        .order("created_at");
      setExpenses(expenseData ?? []);

      setUserId(session.user.id);
      setNewExpPaidBy(session.user.id);
    }

    const itinChannel = supabase
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

    const budgetChannel = supabase
      .channel(`budget:${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "expenses",
        filter: `trip_id=eq.${id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT")
          setExpenses(prev => [...prev, payload.new as Expense]);
        if (payload.eventType === "DELETE")
          setExpenses(prev => prev.filter(e => e.id !== (payload.old as Expense).id));
      })
      .subscribe();

    load();

    return () => {
      supabase.removeChannel(itinChannel);
      supabase.removeChannel(budgetChannel);
    };
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

  async function handleAddExpense() {
    const amt = parseFloat(newExpAmount);
    if (!newExpDesc.trim() || isNaN(amt) || amt <= 0 || !newExpPaidBy) return;
    await supabase.from("expenses").insert({
      trip_id: id,
      description: newExpDesc.trim(),
      amount: amt,
      paid_by: newExpPaidBy,
    });
    setNewExpDesc("");
    setNewExpAmount("");
    setAddingExpense(false);
  }

  async function handleDeleteExpense(expId: string) {
    await supabase.from("expenses").delete().eq("id", expId);
  }

  async function handleSetBudget() {
    const amt = parseFloat(newBudgetAmount);
    if (isNaN(amt) || amt <= 0) return;
    await supabase.from("trips").update({ budget: amt }).eq("id", id);
    setTrip(prev => prev ? { ...prev, budget: amt } : prev);
    setEditingBudget(false);
    setNewBudgetAmount("");
  }

  if (!trip) return (
    <main className="flex min-h-screen items-center justify-center">
      <p style={{ color: "var(--ink-soft)" }}>Loading…</p>
    </main>
  );

  const fromLabel = trip.travel_mode === "drive" ? (trip.from_city ?? trip.from_code) : trip.from_code;
  const toLabel = trip.travel_mode === "drive" ? (trip.to_city ?? trip.to_code) : trip.to_code;
  const dayItems = items.filter(i => i.day_number === activeDay);

  // budget computed values
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const N = members.length;
  const budgetPct = trip.budget ? totalSpent / trip.budget : 0;
  const remaining = (trip.budget ?? 0) - totalSpent;

  function barColor(pct: number) {
    if (pct >= 1) return "var(--coral-deep)";
    if (pct >= 0.9) return "var(--coral)";
    if (pct >= 0.7) return "var(--amber)";
    return "var(--teal)";
  }

  // rounding-safe even split
  const baseShare = N > 0 ? Math.floor((totalSpent / N) * 100) / 100 : 0;
  const remainderCents = N > 0 ? Math.round((totalSpent - baseShare * N) * 100) : 0;
  const balances = members.map((m, i) => {
    const share = i < remainderCents ? baseShare + 0.01 : baseShare;
    const paid = expenses.filter(e => e.paid_by === m.id).reduce((s, e) => s + e.amount, 0);
    return { name: m.name ?? "?", colorIdx: i, balance: Math.round((paid - share) * 100) / 100 };
  });

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
        <div className="mt-6 flex flex-col gap-5">

          {/* Budget goal */}
          {editingBudget ? (
            <div
              className="rounded-[14px] border p-4 flex flex-col gap-3"
              style={{ borderColor: "var(--line)", background: "var(--paper)" }}
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-soft)" }}>
                Group budget
              </p>
              <div className="flex gap-2 items-center">
                <span className="text-[15px] font-bold" style={{ color: "var(--ink-soft)" }}>$</span>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 2000"
                  value={newBudgetAmount}
                  onChange={e => setNewBudgetAmount(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSetBudget()}
                  autoFocus
                  className="flex-1 rounded-xl border px-3 py-2.5 text-[14px] outline-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSetBudget}
                  disabled={!newBudgetAmount || parseFloat(newBudgetAmount) <= 0}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: "var(--coral)" }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingBudget(false); setNewBudgetAmount(""); }}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold transition hover:opacity-70"
                  style={{ border: "1px solid var(--line)", color: "var(--ink-soft)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : trip.budget ? (
            <div
              className="rounded-[14px] border px-4 py-3.5"
              style={{ borderColor: "var(--line)", background: "var(--paper)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-soft)" }}>
                  Group budget
                </p>
                <button
                  onClick={() => { setEditingBudget(true); setNewBudgetAmount(String(trip.budget)); }}
                  className="text-[12px] font-semibold transition hover:opacity-70"
                  style={{ color: "var(--coral)" }}
                >
                  Edit
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[22px] font-bold" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
                  ${totalSpent.toFixed(2)}
                </span>
                <span className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
                  of ${trip.budget.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(budgetPct, 1) * 100}%`,
                    background: barColor(budgetPct),
                  }}
                />
              </div>
              <p
                className="mt-1.5 text-[12px] font-semibold"
                style={{ color: remaining >= 0 ? "var(--ink-soft)" : "var(--coral-deep)" }}
              >
                {remaining >= 0
                  ? `$${remaining.toFixed(2)} left to spend`
                  : `$${Math.abs(remaining).toFixed(2)} over budget`}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setEditingBudget(true)}
              className="w-full rounded-[14px] py-4 text-[14px] font-semibold transition hover:opacity-70"
              style={{ border: "1.5px dashed var(--line)", color: "var(--ink-soft)" }}
            >
              + Set a group budget
            </button>
          )}

          {/* Expenses list */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-2.5" style={{ color: "var(--ink-soft)" }}>
              Expenses
            </p>
            <div className="flex flex-col gap-2">
              {expenses.length === 0 && !addingExpense && (
                <p className="text-center text-[13px] py-2" style={{ color: "var(--ink-soft)" }}>
                  No expenses yet.
                </p>
              )}
              {expenses.map(exp => {
                const payer = members.find(m => m.id === exp.paid_by);
                return (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                    style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] truncate" style={{ color: "var(--ink)" }}>{exp.description}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-soft)" }}>
                        paid by {payer?.name ?? "someone"}
                      </p>
                    </div>
                    <span className="text-[14px] font-semibold flex-shrink-0" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
                      ${exp.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="flex-shrink-0 text-[18px] leading-none transition hover:opacity-80"
                      style={{ color: "var(--ink-soft)", opacity: 0.35 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add expense form */}
            {addingExpense ? (
              <div
                className="mt-3 rounded-[14px] border p-4 flex flex-col gap-3"
                style={{ borderColor: "var(--line)", background: "var(--paper)" }}
              >
                <input
                  type="text"
                  placeholder="e.g. Airbnb, Gas, Dinner"
                  value={newExpDesc}
                  onChange={e => setNewExpDesc(e.target.value)}
                  autoFocus
                  className="rounded-xl border px-3.5 py-2.5 text-[14px] outline-none w-full"
                  style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                />
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-1.5 rounded-xl border px-3 py-2.5"
                    style={{ borderColor: "var(--line)" }}>
                    <span className="text-[14px]" style={{ color: "var(--ink-soft)" }}>$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpAmount}
                      onChange={e => setNewExpAmount(e.target.value)}
                      className="flex-1 outline-none text-[14px] min-w-0"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                  <select
                    value={newExpPaidBy}
                    onChange={e => setNewExpPaidBy(e.target.value)}
                    className="flex-1 rounded-xl border px-2.5 py-2.5 text-[14px] outline-none"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name ?? "?"}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddExpense}
                    disabled={!newExpDesc.trim() || !newExpAmount || parseFloat(newExpAmount) <= 0}
                    className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ background: "var(--coral)" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setAddingExpense(false); setNewExpDesc(""); setNewExpAmount(""); }}
                    className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold transition hover:opacity-70"
                    style={{ border: "1px solid var(--line)", color: "var(--ink-soft)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingExpense(true)}
                className="mt-3 w-full rounded-[13px] py-3 text-[14px] font-semibold transition hover:opacity-70"
                style={{ border: "1.5px dashed var(--line)", color: "var(--ink-soft)" }}
              >
                + Log an expense
              </button>
            )}
          </div>

          {/* Who owes the group pot */}
          {expenses.length > 0 && N > 0 && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-2.5" style={{ color: "var(--ink-soft)" }}>
                Who owes the group pot
              </p>
              <div className="flex flex-col gap-2">
                {balances.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                    style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                      style={{ background: AVATAR_COLORS[b.colorIdx % AVATAR_COLORS.length], fontFamily: "var(--font-bricolage)" }}
                    >
                      {b.name[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
                      {b.name}
                    </span>
                    {b.balance === 0 ? (
                      <span className="text-[13px] font-semibold" style={{ color: "var(--good)" }}>settled ✓</span>
                    ) : b.balance > 0 ? (
                      <span className="text-[13px] font-semibold" style={{ color: "var(--good)" }}>
                        is owed ${b.balance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[13px] font-semibold" style={{ color: "var(--coral-deep)" }}>
                        owes ${Math.abs(b.balance).toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
