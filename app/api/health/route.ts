import { healthStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { ...healthStatus(), time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
