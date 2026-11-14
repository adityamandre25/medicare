"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPatientHeaderDate } from "@/lib/time";
import { SpeakButton } from "./SpeakButton";
import { User, Languages } from "lucide-react";
import { speech, VoiceLanguage } from "@/lib/speech";

interface PatientHeaderProps {
  displayName?: string;
  timeZone?: string;
}

export function PatientHeader({
  displayName: initialDisplayName = "Amma",
  timeZone = "Asia/Kolkata",
}: PatientHeaderProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(speech.getLanguage());
  const [headerInfo, setHeaderInfo] = useState<{
    dayAndDate: string;
    period: string;
    timeString: string;
    fullString: string;
  } | null>(null);

  useEffect(() => {
    try {
      const match = document.cookie.match(/cc_patient=([^;]+)/);
      if (match) {
        const data = JSON.parse(decodeURIComponent(match[1]));
        if (data.displayName) {
          setDisplayName(data.displayName);
        }
      }
    } catch {}

    setVoiceLang(speech.getLanguage());
    const unsub = speech.subscribe((lang) => setVoiceLang(lang));

    setHeaderInfo(formatPatientHeaderDate(new Date(), timeZone));
    const interval = setInterval(() => {
      setHeaderInfo(formatPatientHeaderDate(new Date(), timeZone));
    }, 30000);

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [timeZone]);

  const handleLanguageChange = (newLang: VoiceLanguage) => {
    if (newLang === voiceLang) return;
    speech.setLanguage(newLang);
    setVoiceLang(newLang);
    if (newLang === "hi") {
      speech.speak("नमस्ते अम्मा। आवाज़ को हिंदी में बदल दिया गया है।", undefined, { lang: "hi" });
    } else {
      speech.speak("Voice changed to English.", undefined, { lang: "en" });
    }
  };

  const displayString = headerInfo?.fullString || "Today. CareCompanion.";
  const spokenText = `${displayString} Hello, ${displayName}.`;

  return (
    <header className="w-full bg-white border-b-2 border-gray-200 py-3 px-4 sm:px-6 shadow-xs">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href="/patient/me"
            className="inline-flex items-center gap-1.5 text-lg font-bold text-gray-600 hover:text-[#2E7D32] transition"
            title="Tap to see who you are"
          >
            <User className="w-5 h-5 text-[#2E7D32]" />
            <span>
              Hello, <strong className="text-gray-900 underline decoration-2">{displayName}</strong>
            </span>
          </Link>
          <p className="text-xl sm:text-2xl font-extrabold text-[#1F2937] truncate mt-0.5">
            {displayString}
          </p>
        </div>

        {/* Controls: Voice Language Switcher & Speak Button */}
        <div className="flex items-center gap-2">
          {/* Hindi / English Voice Toggle */}
          <div
            className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-2xs"
            role="group"
            aria-label="Voice Language"
          >
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              className={`px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer touch-manipulation ${
                voiceLang === "en"
                  ? "bg-[#2E7D32] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="English Voice"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("hi")}
              className={`px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer touch-manipulation ${
                voiceLang === "hi"
                  ? "bg-[#2E7D32] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="हिंदी आवाज़ (Hindi Voice)"
            >
              हिन्दी
            </button>
          </div>

          <SpeakButton
            textToSpeak={spokenText}
            ariaLabel="Read date and time aloud"
            size="md"
          />
        </div>
      </div>
    </header>
  );
}
