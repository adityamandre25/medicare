import { NextRequest, NextResponse } from "next/server";
import { alertsStore } from "@/lib/alerts";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId") || undefined;

    const messages = alertsStore.getMessages(patientId);

    // If empty on first load, seed with demo conversation including initial alert context
    if (messages.length === 0) {
      alertsStore.addMessage({
        patient_id: "22222222-2222-2222-2222-222222222222",
        sender_role: "patient",
        sender_name: "Amma",
        kind: "preset",
        body: "Good morning Ravi. Can you bring me a cup of warm water?",
      });

      alertsStore.addMessage({
        patient_id: "22222222-2222-2222-2222-222222222222",
        sender_role: "caregiver",
        sender_name: "Ravi Sharma",
        kind: "text",
        body: "Coming right away Amma! Please remember to take the white tablet in the blue pill box with the water.",
      });
    }

    return NextResponse.json({
      success: true,
      messages: alertsStore.getMessages(patientId),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching messages";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { body, senderRole = "caregiver", senderName, kind = "text", isMedicine, taskTitle } = json;

    if (!body || typeof body !== "string") {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const patientId = json.patientId || "22222222-2222-2222-2222-222222222222";

    const newMsg = alertsStore.addMessage({
      patient_id: patientId,
      sender_role: senderRole,
      sender_name: senderName || (senderRole === "caregiver" ? "Ravi (Caregiver)" : "Amma"),
      kind: kind,
      body: body.trim(),
      is_medicine: isMedicine,
      task_title: taskTitle,
    });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error posting message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

