"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DESTINATIONS, searchDestinations, type Destination } from "@/lib/destinations";

type PickedDest = { city: string; code: string } | null;

function DestinationPicker({
  label,
  placeholder,
  defaultValue,
  onPick,
}: {
  label: string;
  placeholder: string;
  defaultValue?: PickedDest;
  onPick: (d: Destination) => void;
}) {
  const [query, setQuery] = useState(defaultValue?.city ?? "");
  const [results, setResults] = useState<Destination[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    setResults(searchDestinations(val));
    setOpen(true);
  }

  function handleFocus() {
    setResults(searchDestinations(query));
    setOpen(true);
  }

  function pick(d: Destination) {
    setQuery(d.city);
    setOpen(false);
    onPick(d);
  }

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
        {label}
      </label>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={e => handleInput(e.target.value)}
        onFocus={handleFocus}
        className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
        style={{ borderColor: "var(--line)", color: "var(--ink)" }}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div
          className="absolute z-10 mt-1 w-full rounded-xl border overflow-hidden"
          style={{ background: "var(--paper)", borderColor: "var(--line)", boxShadow: "0 8px 20px rgba(27,38,64,.10)" }}
        >
          {results.map(d => (
            <button
              key={d.code}
              type="button"
              onMouseDown={() => pick(d)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#fff0ec]"
              style={{ borderBottom: "1px solid #f1ece3" }}
            >
              <span className="text-[14px] opacity-60">📍</span>
              <span className="flex-1">
                <div className="text-[13.5px] font-semibold" style={{ color: "var(--ink)" }}>{d.city}</div>
                <div className="text-[10.5px]" style={{ color: "var(--ink-soft)" }}>{d.sub}</div>
              </span>
              <span
                className="rounded-[7px] px-1.5 py-0.5 text-[11px] font-bold"
                style={{ background: "#fff0ec", color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}
              >
                {d.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDateRange(start: string, end: string): string | null {
  if (!start && !end) return null;
  const fmt = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  return fmt(end);
}

export default function NewTripPage() {
  const router = useRouter();
  const [tripName, setTripName] = useState("");
  const [from, setFrom] = useState<Destination>(DESTINATIONS[0]); // Raleigh
  const [to, setTo] = useState<Destination | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!tripName.trim() || !to) return;
    setError("");
    setLoading(true);

    const { data: { session } } = await supabase.auth.refreshSession();
    if (!session?.user) { router.push("/"); return; }
    const user = session.user;

    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .insert({
        name: tripName.trim(),
        from_code: from.code,
        to_code: to.code,
        dates: formatDateRange(startDate, endDate),
        budget: budget ? parseFloat(budget) : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (tripErr || !trip) {
      setError(tripErr?.message ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    // Add creator as first member
    await supabase.from("trip_members").insert({ trip_id: trip.id, user_id: user.id });

    setLoading(false);
    router.push("/trips");
  }

  const canSubmit = tripName.trim().length > 0 && to !== null;

  return (
    <main className="flex min-h-screen flex-col px-4 py-10 max-w-sm mx-auto">
      {/* Header */}
      <button
        onClick={() => router.push("/trips")}
        className="mb-6 flex items-center gap-1.5 text-[13px] font-semibold transition hover:opacity-70"
        style={{ color: "var(--ink-soft)" }}
      >
        ← Back
      </button>

      <p
        className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "var(--coral-deep)", fontFamily: "var(--font-bricolage)" }}
      >
        New trip
      </p>
      <h1 className="mt-1 text-[32px] leading-tight mb-6" style={{ color: "var(--ink)" }}>
        Where to?
      </h1>

      <div className="flex flex-col gap-4">
        {/* Trip name */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Trip name
          </label>
          <input
            type="text"
            placeholder="Gatlinburg Getaway"
            value={tripName}
            onChange={e => setTripName(e.target.value)}
            className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          />
        </div>

        {/* From */}
        <DestinationPicker
          label="Leaving from"
          placeholder="Search a city"
          defaultValue={from}
          onPick={setFrom}
        />

        {/* To */}
        <DestinationPicker
          label="Going to"
          placeholder="Search a destination"
          onPick={setTo}
        />

        {/* Dates */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
              End date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Budget ($)
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="1500"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          />
        </div>
      </div>

      {error && <p className="mt-4 text-center text-xs text-red-500">{error}</p>}

      <div className="mt-auto pt-8 flex flex-col gap-2">
        <button
          onClick={handleCreate}
          disabled={loading || !canSubmit}
          className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          style={{ background: "var(--coral)" }}
        >
          {loading ? "Creating…" : "Create trip"}
        </button>
        <button
          onClick={() => router.push("/trips")}
          className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
          style={{ color: "var(--ink-soft)" }}
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
