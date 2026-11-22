import { createHash, randomUUID } from "node:crypto";

/** First address in x-forwarded-for (set by Vercel), else x-real-ip, else "unknown". */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Short one-way hash so logs can group a noisy client without storing the address. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

export function newRequestId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}
