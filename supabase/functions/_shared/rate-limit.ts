// Centralized Rate Limiter supporting Upstash Redis and Local Fallback
// Designed for serverless Deno Edge Functions

// Local in-memory store for fallback
const localStore = new Map<string, { count: number; resetAt: number; blockedUntil?: number }>();

async function redisPipeline(
  url: string,
  token: string,
  commands: string[][],
): Promise<Array<{ result?: number; error?: string }>> {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Redis pipeline error: ${response.statusText} (${text})`);
  }
  return await response.json();
}

function checkLocalRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const record = localStore.get(key);
  const windowMs = windowSeconds * 1000;

  if (record?.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.blockedUntil - now) / 1000) };
  }

  if (!record || now > record.resetAt) {
    localStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (record.count >= limit) {
    // Block for the rest of the window
    record.blockedUntil = now + windowMs;
    return { allowed: false, retryAfter: windowSeconds };
  }

  record.count++;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Check if the request exceeds the rate limit.
 * @param key The unique key to rate limit (e.g. user_id or client_ip).
 * @param limit Max allowed attempts in the window.
 * @param windowSeconds The duration of the window in seconds.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (redisUrl && redisToken) {
    try {
      const url = redisUrl.startsWith('http') ? redisUrl : `https://${redisUrl}`;

      // Execute INCR and TTL in a pipeline to save RTT
      const results = await redisPipeline(url, redisToken, [
        ['INCR', key],
        ['TTL', key],
      ]);

      const count = results[0]?.result;
      let ttl = results[1]?.result ?? -1;
      // A Redis error comes back as { error } with no result. Treat it as a
      // failed call so the in-memory limiter applies, rather than letting
      // `undefined > limit` (false) wave every request through.
      if (typeof count !== 'number') {
        throw new Error(`Unexpected INCR reply: ${results[0]?.error ?? 'no result'}`);
      }

      // If TTL is -1, it means the key was just created and has no expiry.
      // Set the expiry to the window.
      if (ttl === -1) {
        await redisPipeline(url, redisToken, [['EXPIRE', key, String(windowSeconds)]]);
        ttl = windowSeconds;
      }

      if (count > limit) {
        return { allowed: false, retryAfter: ttl > 0 ? ttl : windowSeconds };
      }

      return { allowed: true, retryAfter: 0 };
    } catch (err) {
      console.error(
        '[RATE LIMIT] Upstash Redis connection failed. Falling back to local in-memory store:',
        err,
      );
      // Fall through to local rate limiting fallback
    }
  }

  // Fallback to in-memory map rate limiter
  return checkLocalRateLimit(key, limit, windowSeconds);
}
