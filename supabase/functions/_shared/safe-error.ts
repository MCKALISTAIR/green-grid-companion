/**
 * Security PR: errors go to the server log, clients get a stable code.
 * Never put an exception's message in a response body: it can carry upstream
 * URLs, SQL, or other internals.
 */
import { corsHeaders } from './cors.ts';

export function describeError(err: unknown): { name: string; message: string } {
  return err instanceof Error
    ? { name: err.name, message: err.message }
    : { name: typeof err, message: String(err) };
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
