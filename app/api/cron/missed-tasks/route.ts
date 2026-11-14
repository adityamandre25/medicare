import { NextRequest, NextResponse } from "next/server";
import { alertsStore } from "@/lib/alerts";
import { getDemoTodayInstances } from "@/lib/defaultTasks";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instances = getDemoTodayInstances();
    const result = alertsStore.checkAndGenerateMissedTaskAlerts(instances, "Amma");

    return NextResponse.json({
      success: true,
      message: `Missed tasks cron executed: ${result.newAlertsCount} new alert(s) generated.`,
      activeAlertsCount: result.alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cron error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
