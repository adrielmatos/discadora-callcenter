import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

let cachedDbStatus = "healthy";
let cachedDbLatency = 0;
let lastDbCheck = 0;
const DB_CACHE_TTL_MS = 2500; // Cache de 2.5s para proteger o pool de conexões contra tempestade de probes

export async function GET() {
  const startTime = Date.now();
  const now = Date.now();

  if (now - lastDbCheck > DB_CACHE_TTL_MS) {
    try {
      const dbCheckStart = Date.now();
      const { error } = await supabase.from("empresas").select("id").limit(1);
      cachedDbLatency = Date.now() - dbCheckStart;
      cachedDbStatus = error ? "degraded" : "healthy";
      lastDbCheck = Date.now();
    } catch {
      cachedDbStatus = "unreachable";
      cachedDbLatency = 0;
    }
  }

  const dbStatus = cachedDbStatus;
  const dbLatencyMs = cachedDbLatency;

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
