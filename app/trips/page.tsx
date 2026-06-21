"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TripsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      setUserName(data?.name ?? "");
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

      {/* Empty state */}
      <div className="flex flex-1 flex-col items-center justify-center text-center gap-2"
        style={{ color: "var(--ink-soft)" }}>
        <div className="text-5xl">🧳</div>
        <p className="font-medium">No trips yet.</p>
        <p className="text-[13px] max-w-[200px]">Start one and pull your crew in.</p>
      </div>

      {/* CTA */}
      <button
        className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
        style={{ background: "var(--coral)" }}
      >
        Start a trip
      </button>
    </main>
  );
}
