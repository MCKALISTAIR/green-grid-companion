/**
 * Security PR: errors go to the server log, clients get a stable code.
 * Never put an exception's message in a response body: it can carry upstream
 * URLs, SQL, or other internals.
 */
import { corsHeaders } from './cors.ts';

/**
 * BH-150: mask identifiers that must not reach logs. Octopus account numbers
 * (A-1234ABCD) become "A-***", 13-digit MPANs and long digit runs keep only
 * their first 4 digits, and API keys (sk_live_/sk_test_) are dropped.
 */
export function redactIdentifiers(text: string): string {
  return text
    .replace(/\bA-[A-Z0-9]{6,12}\b/gi, 'A-***')
    .replace(/\bsk_(live|test)_[A-Za-z0-9]+/g, 'sk_$1_***')
    .replace(/\b(\d{4})\d{6,}\b/g, '$1***');
}

export function describeError(err: unknown): { name: string; message: string } {
  return err instanceof Error
    ? { name: err.name, message: redactIdentifiers(err.message) }
    : { name: typeof err, message: redactIdentifiers(String(err)) };
}

/** Log `err` with context (no secrets) and return `{ error, code }` with the given status. */
export function safeErrorResponse(
  opts: {
    code: string;
    error: string;
    status?: number;
    context: string;
    details?: Record<string, unknown>;
  },
  err: unknown,
  log: (...args: unknown[]) => void = console.error,
): Response {
  log(`[${opts.context}] ${opts.code}`, { ...opts.details, ...describeError(err) });
  return new Response(JSON.stringify({ error: opts.error, code: opts.code }), {
    status: opts.status ?? 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
