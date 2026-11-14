"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { LifeBuoy, AlertTriangle, Pill, X, ArrowRight, BellRing } from "lucide-react";

interface NotificationAlert {
  id: string;
  type: "help" | "missed_task";
  title: string;
  message: string;
  time: string;
  isMedicine?: boolean;
}

export function CaregiverAlertNotifier() {
  const [activeNotification, setActiveNotification] = useState<NotificationAlert | null>(null);
  const seenAlertIds = useRef<Set<string>>(new Set());

  // Play audio chime
  const playAlertSound = (isEmergency: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq: number, start: number, duration: number, type: OscillatorType) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      if (isEmergency) {
        // High urgency 2-tone siren
        playTone(920, 0, 0.25, "sawtooth");
        playTone(740, 0.25, 0.25, "sawtooth");
        playTone(920, 0.5, 0.25, "sawtooth");
      } else {
        // Pleasant warning chime
        playTone(587.33, 0, 0.2, "sine");
        playTone(880, 0.2, 0.35, "sine");
      }
    } catch {}
  };

  // Trigger browser notification
  const triggerBrowserNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body,
            icon: "/favicon.ico",
          });
        } catch {}
      } else if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  };

  const handleIncomingAlert = (alert: {
    id: string;
    type: "help" | "missed_task";
    message: string;
    isMedicine?: boolean;
    taskTitle?: string;
  }) => {
    if (seenAlertIds.current.has(alert.id)) return;
    seenAlertIds.current.add(alert.id);

    const isEmergency = alert.type === "help";
    const title = isEmergency
      ? "🚨 EMERGENCY ALERT: Amma"
      : alert.isMedicine
      ? "💊 MISSED TABLET ALERT: Amma"
      : "⏰ OVERDUE ACTIVITY ALERT";

    const notif: NotificationAlert = {
      id: alert.id,
      type: alert.type,
      title,
      message: alert.message || (isEmergency ? "Amma pressed the Emergency Help button!" : "A scheduled task is overdue."),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMedicine: alert.isMedicine,
    };

    setActiveNotification(notif);
    playAlertSound(isEmergency);
    triggerBrowserNotification(title, notif.message);
  };

  useEffect(() => {
    // 1. Listen via BroadcastChannel for zero-latency cross-tab alerts
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("carecompanion_alerts");
      channel.onmessage = (event) => {
        if (event.data && event.data.id) {
          handleIncomingAlert(event.data);
        }
      };
    } catch {}

    // 2. Listen via storage event (backup cross-tab communication)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "cc_latest_alert" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingAlert(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Periodic polling for new active alerts from API
    const checkApiAlerts = async () => {
      try {
        const res = await fetch("/api/alerts");
        if (res.ok) {
          const data = await res.json();
          if (data.activeAlerts && Array.isArray(data.activeAlerts)) {
            data.activeAlerts.forEach((a: any) => {
              if (!seenAlertIds.current.has(a.id)) {
                handleIncomingAlert(a);
              }
            });
          }
        }
      } catch {}
    };

    // Initial check and 4s polling
    checkApiAlerts();
    const interval = setInterval(checkApiAlerts, 4000);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (!activeNotification) return null;

  const isEmergency = activeNotification.type === "help";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-[460px] z-50 animate-bounce-in shadow-2xl"
    >
      <div
        className={`rounded-2xl p-4 sm:p-5 border-2 text-white flex flex-col gap-3 ${
          isEmergency
            ? "bg-red-600 border-red-700 shadow-red-900/40"
            : activeNotification.isMedicine
            ? "bg-amber-600 border-amber-700 shadow-amber-900/40"
            : "bg-slate-900 border-slate-700 shadow-black/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs shrink-0 animate-pulse">
              {isEmergency ? (
                <LifeBuoy className="w-6 h-6 stroke-[3]" />
              ) : activeNotification.isMedicine ? (
                <Pill className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <BellRing className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>
            <div>
              <span className="text-xs uppercase font-black tracking-wider opacity-90">
                {activeNotification.time}
              </span>
              <h3 className="text-lg font-black leading-tight mt-0.5">
                {activeNotification.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveNotification(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm font-semibold leading-relaxed bg-black/20 p-2.5 rounded-xl">
          {activeNotification.message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Link
            href="/caregiver/messages"
            onClick={() => setActiveNotification(null)}
            className="px-4 py-2 rounded-xl bg-white text-gray-900 font-extrabold text-xs flex items-center gap-1.5 hover:bg-gray-100 transition shadow-xs cursor-pointer touch-manipulation"
          >
            <span>Open Messages &amp; Acknowledge</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

