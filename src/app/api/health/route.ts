import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";
  let dbLatencyMs = 0;

  try {
    const dbCheckStart = Date.now();
    const { error } = await supabase.from("empresas").select("id").limit(1);
    dbLatencyMs = Date.now() - dbCheckStart;
    if (error) {
      dbStatus = "degraded";
    }
  } catch (err) {
    dbStatus = "unreachable";
  }

  const memory = process.memoryUsage();
  const uptime = process.uptime();

  const isHealthy = dbStatus !== "unreachable";

  const responsePayload = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    totalLatencyMs: Date.now() - startTime,
    version: "3.2.0",
    services: {
      api: "healthy",
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: "Supabase (PostgreSQL)"
      }
    },
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024)
    }
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Service-Status": isHealthy ? "OK" : "DEGRADED"
    }
  });
}
