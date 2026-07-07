"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AVATAR_COLORS = ["#ff6a5a", "#13b6a3", "#6c63ff", "#f4ad3d", "#e2513f"];

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [venmo, setVenmo] = useState("");
  const [cashapp, setCashapp] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/"); return; }

      setEmail(session.user.email ?? "");
      setUserId(session.user.id);

      const { data } = await supabase
        .from("users")
        .select("name, venmo_username, cashapp_cashtag")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setVenmo(data.venmo_username ?? "");
        setCashapp(data.cashapp_cashtag ?? "");
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave() {
    setError("");
    setSaving(true);
    const { error } = await supabase.from("users").update({
      name: name.trim(),
      venmo_username: venmo.trim().replace(/^@/, "") || null,
      cashapp_cashtag: cashapp.trim().replace(/^\$/, "") || null,
    }).eq("id", userId);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center">
      <p style={{ color: "var(--ink-soft)" }}>Loading…</p>
    </main>
  );

  const avatarColor = AVATAR_COLORS[Math.abs((userId.charCodeAt(0) || 0)) % AVATAR_COLORS.length];
  const initial = name ? name[0].toUpperCase() : "?";

  return (
    <main className="flex min-h-screen flex-col px-4 py-10 max-w-sm mx-auto">
      <button
        onClick={() => router.push("/trips")}
        className="mb-6 flex items-center gap-1.5 text-[13px] font-semibold transition hover:opacity-70"
        style={{ color: "var(--ink-soft)" }}
      >
        ← Your trips
      </button>

      {/* Avatar + name */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-[32px] font-bold text-white mb-3"
          style={{ background: avatarColor, fontFamily: "var(--font-bricolage)" }}
        >
          {initial}
        </div>
        <h1 className="text-[24px] font-bold" style={{ color: "var(--ink)" }}>{name || "Your profile"}</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{email}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Display name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          />
        </div>

        {/* Payment handles */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Payment handles
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
              style={{ borderColor: "var(--line)" }}>
              <span
                className="flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: "#3D95CE" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20.4 2c.8 1.3 1.2 2.7 1.2 4.5 0 5.6-4.8 12.9-8.7 18H4.8L1.6 2.8l7.3-.7 1.8 14.3C12.5 13 14.5 8 14.5 5c0-1.2-.2-2-.5-2.8L20.4 2z"/></svg>
                Venmo
              </span>
              <input
                type="text"
                placeholder="username"
                value={venmo}
                onChange={e => setVenmo(e.target.value)}
                className="flex-1 outline-none text-[14px]"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
              style={{ borderColor: "var(--line)" }}>
              <span
                className="flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: "#00C244" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M14.5 9.1c-.4-.2-1.3-.5-2-.7l-.1-2.1c.7.1 1.5.4 2.1.8l.8-1.8C14.6 4.9 13.5 4.5 12.3 4.4l-.1-1.4H11l.1 1.5c-1.9.3-3.1 1.5-3.1 3.1 0 1.7 1.1 2.5 2.9 3.1l.2 2.4c-.9-.1-1.8-.5-2.6-1.1l-.9 1.8c.9.7 2.1 1.1 3.4 1.2l.1 1.5h1.2l-.1-1.5c2-.3 3.2-1.5 3.2-3.2 0-1.7-1-2.5-2.9-3.2zm-2.7-.5c-.8-.3-1.2-.6-1.2-1.2s.4-1 1.1-1.1l.1 2.3zm1.6 4.6l-.1-2.4c.8.3 1.2.6 1.2 1.2s-.4 1-1.1 1.2z"/></svg>
                Cash App
              </span>
              <input
                type="text"
                placeholder="$cashtag"
                value={cashapp}
                onChange={e => setCashapp(e.target.value)}
                className="flex-1 outline-none text-[14px]"
                style={{ color: "var(--ink)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-center text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="mt-8 w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        style={{ background: saved ? "var(--good)" : "var(--coral)" }}
      >
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
      </button>

      <button
        onClick={handleSignOut}
        className="mt-3 w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-70"
        style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}
      >
        Sign out
      </button>
    </main>
  );
}
