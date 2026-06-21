"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const pkceCode = params.get("code");
      const inviteCode = params.get("invite");

      if (pkceCode) {
        await supabase.auth.exchangeCodeForSession(pkceCode);
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("Something went wrong. Redirecting…");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      const userId = session.user.id;

      // Process invite if present
      if (inviteCode) {
        setStatus("Joining the trip…");
        const { data: trip } = await supabase
          .from("trips")
          .select("id")
          .eq("invite_code", inviteCode)
          .single();

        if (trip) {
          await supabase.from("trip_members").upsert(
            { trip_id: trip.id, user_id: userId },
            { onConflict: "trip_id,user_id" }
          );

          // Make sure user has a name before landing in the trip
          const { data: existing } = await supabase
            .from("users").select("name").eq("id", userId).single();

          if (!existing?.name) {
            router.push(`/?setup=name&after=/trips/${trip.id}`);
          } else {
            router.push(`/trips/${trip.id}`);
          }
          return;
        }
      }

      // Normal login — check if user needs to set a name
      const { data: existing } = await supabase
        .from("users")
        .select("name")
        .eq("id", userId)
        .single();

      if (existing?.name) {
        router.push("/trips");
      } else {
        router.push("/?setup=name");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] text-3xl text-white"
        style={{ background: "var(--ink)", boxShadow: "var(--shadow)" }}
      >
        ✈
      </div>
      <p className="mt-4 text-[15px]" style={{ color: "var(--ink-soft)" }}>
        {status}
      </p>
    </main>
  );
}
