import { NextRequest, NextResponse } from "next/server";
import { translateToHindi } from "@/lib/translations";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { text, language = "en", speaker } = json;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text string is required for speech synthesis" },
        { status: 400 }
      );
    }

    const sarvamApiKey =
      process.env.SARVAM_API_KEY ||
      process.env.NEXT_PUBLIC_SARVAM_API_KEY ||
      "";

    // Prepare text for speech based on language
    let spokenText = text.trim();
    if (language === "hi") {
      spokenText = translateToHindi(spokenText);
    }

    // If no Sarvam API key is configured yet, signal client to use browser speech synthesis fallback
    if (!sarvamApiKey || sarvamApiKey.trim() === "") {
      return NextResponse.json({
        success: false,
        fallback: true,
        message: "SARVAM_API_KEY not configured. Falling back to browser speech synthesis.",
        text: spokenText,
        language,
      });
    }

    const targetLang = language === "hi" ? "hi-IN" : "en-IN";
    // Gentle natural voice personas: "ritu" / "meera" for female, "shubh" for male
    const selectedSpeaker =
      speaker || (language === "hi" ? "ritu" : "meera");

    // Call Sarvam AI Text-to-Speech API
    const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": sarvamApiKey.trim(),
      },
      body: JSON.stringify({
        text: spokenText,
        target_language_code: targetLang,
        language_code: targetLang,
        speaker: selectedSpeaker,
        model: "bulbul:v3",
        pace: 0.90, // gentle, clear pacing for elder accessibility
        speech_sample_rate: 24000,
        enable_preprocessing: true,
        output_audio_codec: "wav",
      }),
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text().catch(() => "");
      console.warn("Sarvam TTS API returned non-200:", sarvamRes.status, errText);

      // Try alternate schema with inputs array if v1 format is expected by older key
      const fallbackRes = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": sarvamApiKey.trim(),
        },
        body: JSON.stringify({
          inputs: [spokenText],
          target_language_code: targetLang,
          speaker: selectedSpeaker,
          model: "bulbul:v1",
          pace: 0.90,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
        }),
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const b64 =
          fallbackData.audios?.[0] || fallbackData.audio || fallbackData.data;
        if (b64) {
          return NextResponse.json({
            success: true,
            audio: b64,
            mimeType: "audio/wav",
            text: spokenText,
            language,
            speaker: selectedSpeaker,
          });
        }
      }

      return NextResponse.json({
        success: false,
        fallback: true,
        message: `Sarvam API error (${sarvamRes.status}). Falling back to browser speech.`,
        text: spokenText,
        language,
      });
    }

    const data = await sarvamRes.json();
    const audioBase64 =
      data.audios?.[0] || data.audio || (Array.isArray(data) ? data[0] : null);

    if (!audioBase64) {
      return NextResponse.json({
        success: false,
        fallback: true,
        message: "No audio stream returned by Sarvam API.",
        text: spokenText,
        language,
      });
    }

    return NextResponse.json({
      success: true,
      audio: audioBase64,
      mimeType: "audio/wav",
      text: spokenText,
      language,
      speaker: selectedSpeaker,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "TTS error";
    return NextResponse.json(
      { success: false, fallback: true, error: msg },
      { status: 500 }
    );
  }
}

