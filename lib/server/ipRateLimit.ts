/**
 * lib/server/ipRateLimit.ts
 *
 * In-memory sliding-window rate limiter for Next.js Edge Middleware.
 *
 * Used for pre-auth, per-IP protection before any Firestore interaction.
 * The Firestore token-bucket in lib/server/rateLimit.ts handles post-auth,
 * per-user limits — these two layers are complementary.
 *
 * Limits (see security.md §5):
 *   - Global:     100 requests / 60 seconds / IP
 *   - Auth routes: 10 requests / 60 seconds / IP  (/api/auth/*)
 *
 * Storage: plain Map capped at MAX_IPS entries (LRU-style eviction).
 * Suitable for single-process (dev + single-instance prod). For multi-
 * instance deployments, swap the Map for an upstash/redis client.
 */

const WINDOW_MS = 60_000; // 1 minute
const GLOBAL_LIMIT = 100;
const AUTH_LIMIT = 10;
const MAX_IPS = 10_000; // cap memory usage

interface Bucket {
  timestamps: number[];
  lastAccess: number;
}

// Two separate maps so auth routes have an independent stricter bucket
const globalBuckets = new Map<string, Bucket>();
const authBuckets = new Map<string, Bucket>();

function evictOldest(map: Map<string, Bucket>): void {
  if (map.size < MAX_IPS) return;
  // Remove the oldest-accessed entry
  let oldest: string | undefined;
  let oldestTime = Infinity;
  for (const [key, bucket] of map.entries()) {
    if (bucket.lastAccess < oldestTime) {
      oldestTime = bucket.lastAccess;
      oldest = key;
    }
  }
  if (oldest) map.delete(oldest);
}

function check(map: Map<string, Bucket>, ip: string, limit: number): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  evictOldest(map);

  const existing = map.get(ip);
  const bucket: Bucket = existing
    ? { timestamps: existing.timestamps.filter((t) => t > windowStart), lastAccess: now }
    : { timestamps: [], lastAccess: now };

  if (bucket.timestamps.length >= limit) {
    map.set(ip, { ...bucket, lastAccess: now });
    return false; // rate limited
  }

  bucket.timestamps.push(now);
  map.set(ip, bucket);
  return true; // allowed
}

/**
 * Returns true if the request is within limits, false if it should be blocked.
 *
 * @param ip       The client IP (from X-Forwarded-For or request.ip)
 * @param isAuth   True for /api/auth/* routes — stricter limit applies
 */
export function ipRateLimitCheck(ip: string, isAuth: boolean): boolean {
  const globalOk = check(globalBuckets, ip, GLOBAL_LIMIT);
  if (!globalOk) return false;

  if (isAuth) {
    const authOk = check(authBuckets, ip, AUTH_LIMIT);
    if (!authOk) return false;
  }

  return true;
}
