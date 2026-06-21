"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    async function handleCallback() {
      // Supabase JS automatically exchanges the code in the URL for a session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("Something went wrong. Redirecting…");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      // Check if this user already has a name
      const { data: existing } = await supabase
        .from("users")
        .select("name")
        .eq("id", session.user.id)
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
