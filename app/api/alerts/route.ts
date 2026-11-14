import { NextRequest, NextResponse } from "next/server";
import { alertsStore } from "@/lib/alerts";
import { getDemoTodayInstances } from "@/lib/defaultTasks";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId") || undefined;

    // Check today's instances for any overdue tasks
    const instances = getDemoTodayInstances();
    alertsStore.checkAndGenerateMissedTaskAlerts(instances, "Amma", patientId);

    const activeAlerts = alertsStore.getActiveAlerts(patientId);
    const allAlerts = alertsStore.getAlerts(patientId);

    return NextResponse.json({
      success: true,
      activeAlerts,
      allAlerts,
      activeCount: activeAlerts.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching alerts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { action, alertId, type, message, simulateType } = json;

    // 1. Resolve an alert
    if (action === "resolve" && alertId) {
      const resolved = alertsStore.resolveAlert(alertId);
      return NextResponse.json({ success: resolved });
    }

    // 2. Simulate missed alert (for testing)
    if (action === "simulate") {
      const alert = alertsStore.simulateMissedAlert(
        simulateType === "activity" ? "activity" : "tablet",
        "Amma"
      );
      return NextResponse.json({ success: true, alert });
    }

    // 3. Create a new alert (e.g., from Emergency Help)
    if (type) {
      const isMedicine =
        type === "missed_task" && /tablet|pill|medicine/i.test(message || "");
      const newAlert = alertsStore.addAlert({
        patient_id: json.patientId || "22222222-2222-2222-2222-222222222222",
        type: type as "help" | "missed_task" | "inactive",
        message: message || "Patient emergency assistance requested.",
        is_medicine: isMedicine,
        category: json.category || (isMedicine ? "medicine" : "general"),
        task_title: json.taskTitle,
      });

      // Also record message for caregiver
      alertsStore.addMessage({
        patient_id: json.patientId || "22222222-2222-2222-2222-222222222222",
        sender_role: type === "help" ? "patient" : "system",
        sender_name: type === "help" ? "Amma (Emergency)" : "CareCompanion Alert",
        kind: type === "help" ? "help_alert" : "missed_alert",
        body: message || "Emergency Help Requested!",
        is_medicine: isMedicine,
      });

      return NextResponse.json({ success: true, alert: newAlert });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error updating alerts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

