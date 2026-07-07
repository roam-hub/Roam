"use client";

import { useEffect, useState } from "react";

type Platform = "android" | "ios" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSCard, setShowIOSCard] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — hide everything
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) { setInstalled(true); return; }

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isIOS) setPlatform("ios");

    // Android/Chrome: capture the install prompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (isAndroid || (!isIOS)) setPlatform("android");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Hide once installed
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }

  // Don't render if already installed, or no relevant platform detected
  if (installed || !platform) return null;

  // Android: one-tap install button
  if (platform === "android") {
    return (
      <button
        onClick={handleAndroidInstall}
        className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: "var(--paper)", border: "1.5px solid var(--line)", color: "var(--ink)" }}
      >
        <span>📲</span> Add Roam to your home screen
      </button>
    );
  }

  // iOS: button that reveals a share-sheet instruction card
  return (
    <div>
      <button
        onClick={() => setShowIOSCard(v => !v)}
        className="w-full rounded-[13px] py-3.5 text-[15px] font-semibold transition hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: "var(--paper)", border: "1.5px solid var(--line)", color: "var(--ink)" }}
      >
        <span>📲</span> Add Roam to your home screen
      </button>

      {showIOSCard && (
        <div
          className="mt-3 rounded-[14px] border p-4 flex flex-col gap-2.5"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Install on iPhone
          </p>
          <div className="flex items-start gap-3">
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: "var(--coral)" }}
            >1</span>
            <p className="text-[13px] leading-snug pt-1" style={{ color: "var(--ink-soft)" }}>
              Tap the <strong style={{ color: "var(--ink)" }}>Share</strong> button{" "}
              <span className="inline-block">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", color: "var(--coral)" }}>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </span>{" "}
              at the bottom of Safari
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: "var(--coral)" }}
            >2</span>
            <p className="text-[13px] leading-snug pt-1" style={{ color: "var(--ink-soft)" }}>
              Scroll down and tap{" "}
              <strong style={{ color: "var(--ink)" }}>Add to Home Screen</strong>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: "var(--coral)" }}
            >3</span>
            <p className="text-[13px] leading-snug pt-1" style={{ color: "var(--ink-soft)" }}>
              Tap <strong style={{ color: "var(--ink)" }}>Add</strong> in the top right
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
