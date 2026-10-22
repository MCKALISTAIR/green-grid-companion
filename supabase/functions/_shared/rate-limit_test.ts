import { assertEquals } from 'jsr:@std/assert@1';
import { checkRateLimit } from './rate-limit.ts';

Deno.test(
  'a Redis error reply falls back to the in-memory limiter instead of allowing everything',
  async () => {
    Deno.env.set('UPSTASH_REDIS_REST_URL', 'https://redis.example');
    Deno.env.set('UPSTASH_REDIS_REST_TOKEN', 't');
    const realFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response(JSON.stringify([{ error: 'ERR' }, { error: 'ERR' }])));
    const origError = console.error;
    console.error = () => {};
    try {
      const key = `test-${crypto.randomUUID()}`;
      const a = await checkRateLimit(key, 1, 60);
      const b = await checkRateLimit(key, 1, 60);
      assertEquals([a.allowed, b.allowed], [true, false]);
    } finally {
      globalThis.fetch = realFetch;
      console.error = origError;
      Deno.env.delete('UPSTASH_REDIS_REST_URL');
      Deno.env.delete('UPSTASH_REDIS_REST_TOKEN');
    }
  },
);
