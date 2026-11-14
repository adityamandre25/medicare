"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pill,
  Clock,
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  Send,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Bell,
  Heart,
} from "lucide-react";
import { CaregiverMessage, CaregiverAlert } from "@/lib/alerts";

export default function CaregiverMessagesPage() {
  const [messages, setMessages] = useState<CaregiverMessage[]>([]);
  const [alerts, setAlerts] = useState<CaregiverAlert[]>([]);
  const [filter, setFilter] = useState<"all" | "medicine" | "activity" | "patient">("all");
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [msgRes, alertRes] = await Promise.all([
        fetch("/api/messages"),
        fetch("/api/alerts"),
      ]);

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        if (msgData.messages) setMessages(msgData.messages);
      }

      if (alertRes.ok) {
        const alertData = await alertRes.json();
        if (alertData.allAlerts) setAlerts(alertData.allAlerts);
      }
    } catch (e) {
      console.warn("Failed to load caregiver messages/alerts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // live refresh
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderRole: "caregiver",
          senderName: "Ravi Sharma",
          kind: "text",
          body: replyText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [data.message, ...prev]);
        setReplyText("");
        showStatus("Message sent to Amma's device!");
      }
    } catch {
      showStatus("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateAlert = async (type: "tablet" | "activity") => {
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate", simulateType: type }),
      });
      if (res.ok) {
        await loadData();
        showStatus(
          type === "tablet"
            ? "Simulated: New Missed Tablet alert received!"
            : "Simulated: New Overdue Activity alert received!"
        );
      }
    } catch {}
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", alertId }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, resolved_at: new Date().toISOString() } : a))
        );
        showStatus("Alert marked as resolved.");
      }
    } catch {}
  };

  const showStatus = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === "medicine") return m.is_medicine || /tablet|pill|medicine/i.test(m.body);
    if (filter === "activity") return m.kind === "missed_alert" && !m.is_medicine;
    if (filter === "patient") return m.sender_role === "patient";
    return true;
  });

  const activeAlertsCount = alerts.filter((a) => !a.resolved_at).length;
  const missedMedicineCount = alerts.filter((a) => !a.resolved_at && a.is_medicine).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/caregiver"
              className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-xs transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Caregiver Messages &amp; Alerts
                </h1>
                {missedMedicineCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700 animate-pulse">
                    {missedMedicineCount} Missed Tablet
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Real-time missed medicine alerts, scheduled task notifications, and family messages.
              </p>
            </div>
          </div>

          {/* Quick Simulation Buttons for Easy Testing */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSimulateAlert("tablet")}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer touch-manipulation"
              title="Test: Simulate missed tablet alert"
            >
              <Pill className="w-3.5 h-3.5 text-red-600" />
              <span>+ Test Missed Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => handleSimulateAlert("activity")}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer touch-manipulation"
              title="Test: Simulate overdue activity alert"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Test Overdue Activity</span>
            </button>
          </div>
        </div>

        {/* Temporary Notification Banner */}
        {statusNotification && (
          <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-900 font-bold text-sm flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <span>{statusNotification}</span>
          </div>
        )}

        {/* Active Alerts Banner if any */}
        {activeAlertsCount > 0 && (
          <div className="mb-6 space-y-3">
            {alerts
              .filter((a) => !a.resolved_at)
              .map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border-2 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    alert.is_medicine
                      ? "bg-red-50/90 border-red-300 text-red-950"
                      : alert.type === "help"
                      ? "bg-red-100 border-red-500 text-red-950"
                      : "bg-amber-50/90 border-amber-300 text-amber-950"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        alert.is_medicine || alert.type === "help"
                          ? "bg-red-200 text-red-800"
                          : "bg-amber-200 text-amber-800"
                      }`}
                    >
                      {alert.is_medicine ? (
                        <Pill className="w-6 h-6 stroke-[2.5]" />
                      ) : alert.type === "help" ? (
                        <LifeBuoy className="w-6 h-6 stroke-[2.5]" />
                      ) : (
                        <Clock className="w-6 h-6 stroke-[2.5]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base">
                          {alert.is_medicine
                            ? "MISSED MEDICINE ALERT"
                            : alert.type === "help"
                            ? "EMERGENCY HELP REQUEST"
                            : "OVERDUE ACTIVITY"}
                        </span>
                        <span className="text-xs bg-white/80 px-2 py-0.5 rounded-md font-mono font-bold">
                          {alert.scheduled_time || "Pending"}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1 leading-snug">{alert.message}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer self-end sm:self-center shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                    <span>Acknowledge &amp; Resolve</span>
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-6 overflow-x-auto">
          {[
            { id: "all", label: "All Messages & Alerts", icon: MessageSquare },
            { id: "medicine", label: "Missed Medicine", icon: Pill },
            { id: "activity", label: "Overdue Activities", icon: Clock },
            { id: "patient", label: "From Amma", icon: Heart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#2E7D32] text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Feed */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4 mb-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-[#2E7D32]" />
              <p className="text-sm">Loading message thread...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-base font-bold">No messages in this category yet</p>
              <p className="text-xs text-gray-400 mt-1">
                When Amma misses a tablet or an activity, automated alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredMessages.map((msg) => {
                const isMissedAlert = msg.kind === "missed_alert";
                const isHelpAlert = msg.kind === "help_alert";
                const isCaregiver = msg.sender_role === "caregiver";

                if (isMissedAlert) {
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-2xl border-l-4 shadow-2xs ${
                        msg.is_medicine
                          ? "bg-red-50/70 border-red-500 text-red-950"
                          : "bg-amber-50/70 border-amber-500 text-amber-950"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            msg.is_medicine
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {msg.is_medicine ? (
                            <>
                              <Pill className="w-3.5 h-3.5" />
                              Missed Tablet Alert
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              Overdue Activity Alert
                            </>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{msg.body}</p>
                    </div>
                  );
                }

                if (isHelpAlert) {
                  return (
                    <div
                      key={msg.id}
                      className="p-4 rounded-2xl border-l-4 border-red-600 bg-red-100 text-red-950 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-xs font-black bg-red-200 text-red-900 px-2 py-0.5 rounded-full">
                          <LifeBuoy className="w-3.5 h-3.5" />
                          Emergency Help Alert
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-bold">{msg.body}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isCaregiver ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-1 px-1">
                      {msg.sender_name} &bull;{" "}
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div
                      className={`p-3.5 max-w-[85%] sm:max-w-[75%] rounded-2xl text-sm leading-relaxed ${
                        isCaregiver
                          ? "bg-[#2E7D32] text-white rounded-tr-xs shadow-xs"
                          : "bg-gray-100 text-gray-900 rounded-tl-xs border border-gray-200"
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Replies & Caregiver Composer */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold text-gray-600">
            <span className="text-gray-400 shrink-0">Quick reply:</span>
            {[
              "Coming upstairs right now, Amma!",
              "Please take your medicine with a glass of water.",
              "I am right here with you, you are safe.",
              "I love you too, Amma!",
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyText(preset)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap cursor-pointer touch-manipulation transition"
              >
                {preset}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a reassuring message to send to Amma's screen..."
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#2E7D32] focus:border-[#2E7D32]"
            />
            <button
              type="submit"
              disabled={isSending || !replyText.trim()}
              className="px-5 py-3 rounded-2xl bg-[#2E7D32] hover:bg-[#256629] text-white font-bold text-sm flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
