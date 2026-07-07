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
  budget: number | null;
  invite_code: string;
};

type Member = {
  id: string;
  name: string | null;
  venmo_username: string | null;
  cashapp_cashtag: string | null;
};

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

type Poll = {
  id: string;
  question: string;
  created_by: string | null;
  created_at: string;
};

type PollOption = {
  id: string;
  poll_id: string;
  text: string;
  position: number;
};

type PollVote = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
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

  // payment handle state
  const [editingHandles, setEditingHandles] = useState(false);
  const [newVenmo, setNewVenmo] = useState("");
  const [newCashapp, setNewCashapp] = useState("");

  // polls state
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

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
          .select("id, name, venmo_username, cashapp_cashtag")
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

      const { data: pollData } = await supabase
        .from("polls").select("id, question, created_by, created_at")
        .eq("trip_id", id).order("created_at");
      setPolls(pollData ?? []);

      if ((pollData ?? []).length > 0) {
        const pollIds = pollData!.map(p => p.id);
        const { data: optData } = await supabase
          .from("poll_options").select("id, poll_id, text, position")
          .in("poll_id", pollIds).order("position");
        setPollOptions(optData ?? []);

        const { data: voteData } = await supabase
          .from("poll_votes").select("id, poll_id, option_id, user_id")
          .in("poll_id", pollIds);
        setPollVotes(voteData ?? []);
      }

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
          const incoming = payload.new as ItineraryItem;
          setItems(prev =>
            prev.some(i => i.id === incoming.id)
              ? prev
              : [...prev, incoming].sort((a, b) => a.time_minutes - b.time_minutes)
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

    const membersChannel = supabase
      .channel(`members:${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "trip_members",
        filter: `trip_id=eq.${id}`,
      }, async (payload) => {
        const newUserId = (payload.new as { user_id: string }).user_id;
        const { data: userData } = await supabase
          .from("users")
          .select("id, name, venmo_username, cashapp_cashtag")
          .eq("id", newUserId)
          .single();
        if (userData) {
          setMembers(prev =>
            prev.some(m => m.id === userData.id) ? prev : [...prev, userData]
          );
        }
      })
      .subscribe();

    const pollsChannel = supabase
      .channel(`polls:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "polls",
        filter: `trip_id=eq.${id}` }, (payload) => {
        if (payload.eventType === "INSERT")
          setPolls(prev => [...prev, payload.new as Poll]);
        if (payload.eventType === "DELETE") {
          const gone = (payload.old as Poll).id;
          setPolls(prev => prev.filter(p => p.id !== gone));
          setPollOptions(prev => prev.filter(o => o.poll_id !== gone));
          setPollVotes(prev => prev.filter(v => v.poll_id !== gone));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const incoming = payload.new as PollOption;
          setPollOptions(prev =>
            prev.some(o => o.id === incoming.id)
              ? prev
              : [...prev, incoming].sort((a, b) => a.position - b.position)
          );
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, (payload) => {
        if (payload.eventType === "INSERT")
          setPollVotes(prev => [...prev, payload.new as PollVote]);
        if (payload.eventType === "UPDATE")
          setPollVotes(prev => prev.map(v => v.id === (payload.new as PollVote).id ? payload.new as PollVote : v));
        if (payload.eventType === "DELETE")
          setPollVotes(prev => prev.filter(v => v.id !== (payload.old as PollVote).id));
      })
      .subscribe();

    load();

    return () => {
      supabase.removeChannel(itinChannel);
      supabase.removeChannel(budgetChannel);
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(pollsChannel);
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
    const { data: inserted } = await supabase.from("itinerary_items").insert({
      trip_id: id,
      day_number: activeDay,
      time_minutes,
      time_label,
      description: newDesc.trim(),
      created_by: userId,
    }).select("id, day_number, time_minutes, time_label, description").single();
    if (inserted) {
      setItems(prev =>
        prev.some(i => i.id === inserted.id)
          ? prev
          : [...prev, inserted].sort((a, b) => a.time_minutes - b.time_minutes)
      );
    }
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

  async function handleSaveHandles() {
    if (!userId) return;
    const venmo = newVenmo.trim().replace(/^@/, "");
    const cashapp = newCashapp.trim().replace(/^\$/, "");
    await supabase.from("users")
      .update({ venmo_username: venmo || null, cashapp_cashtag: cashapp || null })
      .eq("id", userId);
    setMembers(prev => prev.map(m =>
      m.id === userId
        ? { ...m, venmo_username: venmo || null, cashapp_cashtag: cashapp || null }
        : m
    ));
    setEditingHandles(false);
  }

  async function handleCreatePoll() {
    const question = newPollQuestion.trim();
    const opts = newPollOptions.map(o => o.trim()).filter(Boolean);
    if (!question || opts.length < 2 || !userId) return;
    const { data: poll } = await supabase
      .from("polls").insert({ trip_id: id, question, created_by: userId })
      .select("id").single();
    if (!poll) return;
    await supabase.from("poll_options").insert(
      opts.map((text, i) => ({ poll_id: poll.id, text, position: i }))
    );
    // fetch options immediately so they render without waiting for realtime delivery
    const { data: freshOpts } = await supabase
      .from("poll_options").select("id, poll_id, text, position")
      .eq("poll_id", poll.id).order("position");
    setPollOptions(prev => {
      const merged = [...prev, ...(freshOpts ?? [])];
      return merged.filter((o, i) => merged.findIndex(x => x.id === o.id) === i);
    });
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setCreatingPoll(false);
  }

  async function handleVote(pollId: string, optionId: string) {
    if (!userId) return;
    const existing = pollVotes.find(v => v.poll_id === pollId && v.user_id === userId);
    if (existing) {
      if (existing.option_id === optionId) {
        await supabase.from("poll_votes").delete().eq("id", existing.id);
      } else {
        await supabase.from("poll_votes").update({ option_id: optionId }).eq("id", existing.id);
      }
    } else {
      await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, user_id: userId });
    }
  }

  async function handleDeletePoll(pollId: string) {
    await supabase.from("polls").delete().eq("id", pollId);
    setPolls(prev => prev.filter(p => p.id !== pollId));
    setPollOptions(prev => prev.filter(o => o.poll_id !== pollId));
    setPollVotes(prev => prev.filter(v => v.poll_id !== pollId));
  }

  function openHandlesForm() {
    const me = members.find(m => m.id === userId);
    setNewVenmo(me?.venmo_username ?? "");
    setNewCashapp(me?.cashapp_cashtag ?? "");
    setEditingHandles(true);
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
    return {
      member: m,
      name: m.name ?? "?",
      colorIdx: i,
      balance: Math.round((paid - share) * 100) / 100,
    };
  });

  const me = members.find(m => m.id === userId);
  const meHasNoHandles = me && !me.venmo_username && !me.cashapp_cashtag;
  const note = encodeURIComponent(`Roam: ${trip.name}`);

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
        {(["plan", "budget", "polls", "crew", "photos"] as const).map(tab => (
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
          <div className="flex flex-wrap gap-2">
            {[1,2,3,4,5,6,7].map(day => (
              <button
                key={day}
                onClick={() => { setActiveDay(day); setAddingItem(false); }}
                className="rounded-xl px-4 py-2 text-[13px] font-semibold transition"
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

          {/* Payment handles prompt */}
          {editingHandles ? (
            <div
              className="rounded-[14px] border p-4 flex flex-col gap-3"
              style={{ borderColor: "var(--line)", background: "var(--paper)" }}
            >
              <p className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                Your payment handles
              </p>
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--line)" }}>
                <span className="text-[13px] font-semibold w-16 flex-shrink-0" style={{ color: "var(--ink-soft)" }}>Venmo</span>
                <input
                  type="text"
                  placeholder="username"
                  value={newVenmo}
                  onChange={e => setNewVenmo(e.target.value)}
                  autoFocus
                  className="flex-1 outline-none text-[14px]"
                  style={{ color: "var(--ink)" }}
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--line)" }}>
                <span className="text-[13px] font-semibold w-16 flex-shrink-0" style={{ color: "var(--ink-soft)" }}>Cash App</span>
                <input
                  type="text"
                  placeholder="$cashtag"
                  value={newCashapp}
                  onChange={e => setNewCashapp(e.target.value)}
                  className="flex-1 outline-none text-[14px]"
                  style={{ color: "var(--ink)" }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveHandles}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
                  style={{ background: "var(--coral)" }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingHandles(false)}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold transition hover:opacity-70"
                  style={{ border: "1px solid var(--line)", color: "var(--ink-soft)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : meHasNoHandles ? (
            <div
              className="rounded-[14px] border px-4 py-3.5 flex items-center justify-between"
              style={{ borderColor: "var(--line)", borderStyle: "dashed" }}
            >
              <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
                Add your Venmo or Cash App so crewmates can pay you
              </p>
              <button
                onClick={openHandlesForm}
                className="ml-3 flex-shrink-0 text-[13px] font-semibold transition hover:opacity-70"
                style={{ color: "var(--coral)" }}
              >
                Add →
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={openHandlesForm}
                className="text-[12px] font-semibold transition hover:opacity-70"
                style={{ color: "var(--ink-soft)" }}
              >
                Edit payment handles
              </button>
            </div>
          )}

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
              <div className="mb-1.5">
                <span className="text-[22px] font-bold" style={{ fontFamily: "var(--font-bricolage)", color: remaining >= 0 ? "var(--ink)" : "var(--coral-deep)" }}>
                  {remaining >= 0 ? `$${remaining.toFixed(2)} left` : `$${Math.abs(remaining).toFixed(2)} over`}
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
                style={{ color: "var(--ink-soft)" }}
              >
                You&apos;ve spent ${totalSpent.toFixed(2)} of ${trip.budget.toLocaleString()}
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
                {balances.map((b, i) => {
                  const amt = Math.abs(b.balance).toFixed(2);
                  const venmoUrl = b.member.venmo_username
                    ? `venmo://paycharge?txn=pay&recipients=${b.member.venmo_username}&amount=${amt}&note=${decodeURIComponent(note)}`
                    : null;
                  const cashUrl = b.member.cashapp_cashtag
                    ? `https://cash.app/$${b.member.cashapp_cashtag}/${amt}`
                    : null;
                  const isMe = b.member.id === userId;
                  const owes = b.balance < 0;

                  return (
                    <div
                      key={i}
                      className="rounded-xl px-3.5 py-3"
                      style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
                    >
                      <div className="flex items-center gap-3">
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
                            owes ${amt}
                          </span>
                        )}
                      </div>

                      {/* Pay buttons row — only for owing members */}
                      {owes && (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          {venmoUrl && (
                            <a
                              href={venmoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-[9px] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-85"
                              style={{ background: "#3D95CE" }}
                            >
                              Venmo
                            </a>
                          )}
                          {cashUrl && (
                            <a
                              href={cashUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-[9px] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-85"
                              style={{ background: "#00D632" }}
                            >
                              Cash App
                            </a>
                          )}
                          {!venmoUrl && !cashUrl && (
                            isMe ? (
                              <button
                                onClick={openHandlesForm}
                                className="text-[11px] font-semibold transition hover:opacity-70"
                                style={{ color: "var(--coral)" }}
                              >
                                Add your handles so crewmates can pay you →
                              </button>
                            ) : (
                              <span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
                                {b.name} hasn&apos;t added a payment handle yet
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "polls" && (
        <div className="mt-6 flex flex-col gap-4">

          {/* Create poll form or button */}
          {creatingPoll ? (
            <div
              className="rounded-[14px] border p-4 flex flex-col gap-3"
              style={{ borderColor: "var(--line)", background: "var(--paper)" }}
            >
              <input
                type="text"
                placeholder="Ask the group something…"
                value={newPollQuestion}
                onChange={e => setNewPollQuestion(e.target.value)}
                autoFocus
                className="rounded-xl border px-3.5 py-2.5 text-[14px] outline-none w-full font-semibold"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
              <div className="flex flex-col gap-2">
                {newPollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={e => {
                        const updated = [...newPollOptions];
                        updated[i] = e.target.value;
                        setNewPollOptions(updated);
                      }}
                      className="flex-1 rounded-xl border px-3.5 py-2.5 text-[14px] outline-none"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    />
                    {newPollOptions.length > 2 && (
                      <button
                        onClick={() => setNewPollOptions(prev => prev.filter((_, j) => j !== i))}
                        className="flex-shrink-0 text-[18px] leading-none transition hover:opacity-80"
                        style={{ color: "var(--ink-soft)", opacity: 0.4 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setNewPollOptions(prev => [...prev, ""])}
                  className="text-left text-[13px] font-semibold transition hover:opacity-70 px-1"
                  style={{ color: "var(--ink-soft)" }}
                >
                  + Add option
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePoll}
                  disabled={!newPollQuestion.trim() || newPollOptions.filter(o => o.trim()).length < 2}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: "var(--coral)" }}
                >
                  Create poll
                </button>
                <button
                  onClick={() => { setCreatingPoll(false); setNewPollQuestion(""); setNewPollOptions(["", ""]); }}
                  className="flex-1 rounded-[11px] py-2.5 text-[14px] font-semibold transition hover:opacity-70"
                  style={{ border: "1px solid var(--line)", color: "var(--ink-soft)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreatingPoll(true)}
              className="w-full rounded-[13px] py-3 text-[14px] font-semibold transition hover:opacity-70"
              style={{ border: "1.5px dashed var(--line)", color: "var(--ink-soft)" }}
            >
              + Create a poll
            </button>
          )}

          {/* Poll cards */}
          {polls.length === 0 && !creatingPoll && (
            <p className="text-center text-[13px] py-4" style={{ color: "var(--ink-soft)" }}>
              No polls yet — ask the group something!
            </p>
          )}
          {polls.map(poll => {
            const opts = pollOptions.filter(o => o.poll_id === poll.id);
            const votes = pollVotes.filter(v => v.poll_id === poll.id);
            const totalVotes = votes.length;
            const myVote = votes.find(v => v.user_id === userId);
            const maxCount = Math.max(...opts.map(o => votes.filter(v => v.option_id === o.id).length), 0);

            return (
              <div
                key={poll.id}
                className="rounded-[14px] border overflow-hidden"
                style={{ borderColor: "var(--line)", background: "var(--paper)" }}
              >
                {/* Question header */}
                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                  <p className="text-[15px] font-semibold leading-snug" style={{ color: "var(--ink)" }}>
                    {poll.question}
                  </p>
                  <button
                    onClick={() => handleDeletePoll(poll.id)}
                    className="flex-shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition hover:opacity-70"
                    style={{ background: "var(--line)", color: "var(--ink-soft)" }}
                  >
                    Delete
                  </button>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-0 border-t" style={{ borderColor: "var(--line)" }}>
                  {opts.map((opt, oi) => {
                    const count = votes.filter(v => v.option_id === opt.id).length;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isLeading = count > 0 && count === maxCount;
                    const isMine = myVote?.option_id === opt.id;
                    const optionVoters = votes
                      .filter(v => v.option_id === opt.id)
                      .map(v => members.find(m => m.id === v.user_id))
                      .filter(Boolean) as Member[];

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleVote(poll.id, opt.id)}
                        className="relative text-left w-full transition"
                        style={{
                          borderTop: oi > 0 ? `1px solid var(--line)` : undefined,
                        }}
                      >
                        {/* Fill bar */}
                        <div
                          className="absolute inset-0 transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            background: isLeading ? "rgba(255,106,90,0.10)" : "rgba(230,221,207,0.5)",
                          }}
                        />
                        <div className="relative px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-[14px] leading-snug"
                              style={{
                                color: "var(--ink)",
                                fontWeight: isLeading ? 600 : 400,
                              }}
                            >
                              {opt.text}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
                                {pct}%
                              </span>
                              {isMine && (
                                <span className="text-[13px] font-bold" style={{ color: "var(--coral)" }}>✓</span>
                              )}
                            </div>
                          </div>
                          {/* Voter avatars */}
                          {optionVoters.length > 0 && (
                            <div className="flex items-center mt-1.5">
                              {optionVoters.map((voter, vi) => {
                                const memberIdx = members.findIndex(m => m.id === voter.id);
                                return (
                                  <div
                                    key={voter.id}
                                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white border"
                                    style={{
                                      background: AVATAR_COLORS[memberIdx % AVATAR_COLORS.length],
                                      borderColor: "var(--paper)",
                                      marginLeft: vi === 0 ? 0 : -4,
                                      fontFamily: "var(--font-bricolage)",
                                    }}
                                    title={voter.name ?? "?"}
                                  >
                                    {(voter.name ?? "?")[0].toUpperCase()}
                                  </div>
                                );
                              })}
                              <span className="ml-1.5 text-[11px]" style={{ color: "var(--ink-soft)" }}>
                                {optionVoters.map(v => v.name ?? "?").join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Total votes footer */}
                <div className="px-4 py-2 border-t" style={{ borderColor: "var(--line)" }}>
                  <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
                    {totalVotes} {totalVotes === 1 ? "vote" : "votes"} · tap to vote
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "crew" && (
        <div className="mt-6 flex flex-col gap-5">

          {/* Member list */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: "var(--ink-soft)" }}>
              {members.length} on the trip
            </p>
            <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--paper)" }}>
              {members.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--line)" : undefined }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], fontFamily: "var(--font-bricolage)" }}
                  >
                    {(m.name ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="flex-1 text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
                    {m.name ?? "Unknown"}
                  </span>
                  {m.id === userId && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: "var(--coral)" }}
                    >
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite section */}
          <div>
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
        </div>
      )}

      {activeTab === "photos" && (
        <div className="mt-8 rounded-2xl border px-5 py-10 text-center"
          style={{ borderColor: "var(--line)", borderStyle: "dashed" }}>
          <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>Coming soon</p>
        </div>
      )}
    </main>
  );
}
