/**
 * Realistic Human Voice-over Helper
 * Powered by Sarvam AI Text-to-Speech (with seamless Hindi & English support)
 * and graceful fallback to browser Web Speech API.
 */

import { translateToHindi } from "./translations";

export type VoiceLanguage = "en" | "hi";

class HumanSpeechHelper {
  private currentLanguage: VoiceLanguage = "en";
  private currentAudio: HTMLAudioElement | null = null;
  private audioCache = new Map<string, string>(); // cache: `${lang}:${text}` -> base64 wav
  private listeners: Set<(lang: VoiceLanguage) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cc_voice_lang") as VoiceLanguage | null;
        if (saved === "en" || saved === "hi") {
          this.currentLanguage = saved;
        }
      } catch {}
    }
  }

  public getLanguage(): VoiceLanguage {
    return this.currentLanguage;
  }

  public setLanguage(lang: VoiceLanguage): void {
    this.currentLanguage = lang;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cc_voice_lang", lang);
      } catch {}
    }
    this.listeners.forEach((cb) => cb(lang));
  }

  public subscribe(cb: (lang: VoiceLanguage) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Speaks the text using Sarvam AI human-like voice synthesis,
   * falling back to browser speech synthesis if offline or unconfigured.
   */
  public async speak(
    rawText: string,
    onEnd?: () => void,
    options?: { lang?: VoiceLanguage; speaker?: string }
  ): Promise<void> {
    if (!rawText || typeof rawText !== "string") {
      if (onEnd) onEnd();
      return;
    }

    this.stop();

    const lang = options?.lang || this.currentLanguage;
    const cacheKey = `${lang}:${rawText.trim()}`;

    // 1. Check in-memory audio cache for instant playback
    if (this.audioCache.has(cacheKey)) {
      const cachedB64 = this.audioCache.get(cacheKey)!;
      this.playBase64Audio(cachedB64, onEnd);
      return;
    }

    try {
      // 2. Request Sarvam AI realistic human speech from backend route
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          language: lang,
          speaker: options?.speaker,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audio) {
          this.audioCache.set(cacheKey, data.audio);
          this.playBase64Audio(data.audio, onEnd);
          return;
        }
      }
    } catch (err) {
      console.warn("Sarvam TTS fetch error, falling back to browser speech:", err);
    }

    // 3. Fallback: Browser Web Speech API
    this.speakNativeBrowser(rawText, lang, onEnd);
  }

  private playBase64Audio(base64Wav: string, onEnd?: () => void): void {
    try {
      const audioUrl = base64Wav.startsWith("data:")
        ? base64Wav
        : `data:audio/wav;base64,${base64Wav}`;

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.play().catch((e) => {
        console.warn("Audio element play error:", e);
        if (onEnd) onEnd();
      });
    } catch {
      if (onEnd) onEnd();
    }
  }

  private speakNativeBrowser(
    rawText: string,
    lang: VoiceLanguage,
    onEnd?: () => void
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      const textToSpeak = lang === "hi" ? translateToHindi(rawText) : rawText;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.88; // gentle, reassuring pace
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (lang === "hi") {
        utterance.lang = "hi-IN";
        const hindiVoice = voices.find(
          (v) => v.lang.startsWith("hi") || v.name.includes("Hindi")
        );
        if (hindiVoice) utterance.voice = hindiVoice;
      } else {
        utterance.lang = "en-IN";
        const naturalVoice = voices.find(
          (v) =>
            (v.lang.startsWith("en-IN") || v.lang.startsWith("en")) &&
            (v.name.includes("Natural") ||
              v.name.includes("India") ||
              v.name.includes("Google") ||
              v.name.includes("Samantha") ||
              v.name.includes("Heera"))
        );
        if (naturalVoice) utterance.voice = naturalVoice;
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnd) onEnd();
    }
  }
}

export const speech = new HumanSpeechHelper();
