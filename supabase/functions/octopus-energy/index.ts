// @ts-expect-error: Suppress Deno namespace error
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Hack to make VS Code happy with Deno globals in a Node workspace
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- RATE LIMITING ---
// In-memory rate limiter for credential operations
// Note: This resets on function cold starts, but provides protection during active use
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,        // Max attempts per window
  windowMs: 60 * 1000,   // 1 minute window
  blockDurationMs: 5 * 60 * 1000, // 5 minute block after exceeding limit
};

function checkRateLimit(userId: string, action: string): { allowed: boolean; retryAfter?: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Check if currently blocked
  if (entry && entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Clean up expired entries
  if (entry && (now - entry.firstAttempt) > RATE_LIMIT_CONFIG.windowMs) {
    rateLimitStore.delete(key);
  }

  const currentEntry = rateLimitStore.get(key);

  if (!currentEntry) {
    // First attempt in window
    rateLimitStore.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true };
  }

  if (currentEntry.count >= RATE_LIMIT_CONFIG.maxAttempts) {
    // Exceeded limit - block user
    currentEntry.blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
    rateLimitStore.set(key, currentEntry);
    const retryAfter = Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  currentEntry.count++;
  rateLimitStore.set(key, currentEntry);
  return { allowed: true };
}

// --- SECURITY LOGGING ---
// Comprehensive logging for security monitoring
interface SecurityEvent {
  type: 'AUTH_FAILURE' | 'RATE_LIMIT' | 'VALIDATION_FAILURE' | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, unknown>;
  timestamp: string;
}

function logSecurityEvent(event: SecurityEvent) {
  const logEntry = {
    security_event: true,
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  // Use appropriate log level based on severity
  switch (event.severity) {
    case 'CRITICAL':
    case 'HIGH':
      console.error(`[SECURITY] ${event.type}:`, JSON.stringify(logEntry));
      break;
    case 'MEDIUM':
      console.warn(`[SECURITY] ${event.type}:`, JSON.stringify(logEntry));
      break;
    default:
      console.info(`[SECURITY] ${event.type}:`, JSON.stringify(logEntry));
  }
}

// Track failed auth attempts for pattern detection
const authFailureTracker = new Map<string, { count: number; firstFailure: number }>();
const AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minute window
const AUTH_FAILURE_THRESHOLD = 10; // Alert after 10 failures from same IP

function trackAuthFailure(ip: string, reason: string, userAgent: string | null) {
  const now = Date.now();
  const existing = authFailureTracker.get(ip);

  if (existing && (now - existing.firstFailure) < AUTH_FAILURE_WINDOW_MS) {
    existing.count++;
    authFailureTracker.set(ip, existing);

    // Escalate severity based on failure count
    const severity = existing.count >= AUTH_FAILURE_THRESHOLD ? 'HIGH' :
      existing.count >= 5 ? 'MEDIUM' : 'LOW';

    logSecurityEvent({
      type: existing.count >= AUTH_FAILURE_THRESHOLD ? 'SUSPICIOUS_ACTIVITY' : 'AUTH_FAILURE',
      severity,
      details: {
        ip,
        reason,
        user_agent: userAgent,
        failure_count: existing.count,
        window_minutes: 15,
        message: existing.count >= AUTH_FAILURE_THRESHOLD
          ? `Potential brute force attack: ${existing.count} failures from IP ${ip}`
          : `Auth failure from ${ip}`,
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    // First failure or window expired
    authFailureTracker.set(ip, { count: 1, firstFailure: now });

    logSecurityEvent({
      type: 'AUTH_FAILURE',
      severity: 'LOW',
      details: {
        ip,
        reason,
        user_agent: userAgent,
        failure_count: 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// Cleanup old auth failure entries
function cleanupAuthFailureTracker() {
  const now = Date.now();
  for (const [ip, data] of authFailureTracker.entries()) {
    if ((now - data.firstFailure) > AUTH_FAILURE_WINDOW_MS) {
      authFailureTracker.delete(ip);
    }
  }
}

// Periodic cleanup of old entries (runs on each request, but is fast)
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.blockedUntil < now && (now - entry.firstAttempt) > RATE_LIMIT_CONFIG.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

interface OctopusConsumption {
  consumption: number;
  interval_start: string;
  interval_end: string;
}

interface OctopusMeterPoint {
  mpan?: string;
  mprn?: string;
  meters: { serial_number: string }[];
}

interface OctopusProperty {
  electricity_meter_points?: OctopusMeterPoint[];
  gas_meter_points?: OctopusMeterPoint[];
}

interface FootprintRecord {
  interval_start: string;
  interval_end: string;
  consumption_kwh: number;
  intensity_gco2_kwh: number;
  carbon_g: number;
  intensity_index: string;
  mpan: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract request metadata for logging
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent');
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create a Supabase client with the Auth context of the logged in user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      trackAuthFailure(clientIP, 'missing_auth_header', userAgent);
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for malformed auth header
    if (!authHeader.startsWith('Bearer ') || authHeader.length < 20) {
      trackAuthFailure(clientIP, 'malformed_auth_header', userAgent);
      return new Response(
        JSON.stringify({ error: 'Invalid Authorization header format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the user's JWT to create a scoped client (or use service role and get user manually)
    // We'll use service role to allow access to the credentials table (which might be protected/private),
    // but we MUST validate the user first.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate User
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      trackAuthFailure(clientIP, userError?.message || 'invalid_token', userAgent);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse action and params
    let action: string | null = null;
    let days: number = 7;
    let payload: any = {};

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      action = body.action || null;
      days = parseInt(body.days) || 7;
      payload = body;
    } else {
      const url = new URL(req.url);
      action = url.searchParams.get('action');
      days = parseInt(url.searchParams.get('days') || '7');
    }

    console.log(`[${requestId}] Octopus Energy API - Action: ${action}, Days: ${days}, User: ${userId.substring(0, 8)}...`);

    // Cleanup old entries periodically
    cleanupRateLimitStore();
    cleanupAuthFailureTracker();

    // --- CREDENTIALS VALIDATION ---

    // Server-side validation for credentials format
    function validateCredentials(apiKey: string, accountNumber: string): { valid: boolean; errors: string[] } {
      const errors: string[] = [];

      // Account number validation: A-XXXXXXXX format (letter A, dash, 8 alphanumeric)
      const accountPattern = /^A-[A-Z0-9]{8}$/i;
      const sanitizedAccount = accountNumber?.trim().toUpperCase() || '';

      if (!sanitizedAccount) {
        errors.push('Account number is required');
      } else if (!accountPattern.test(sanitizedAccount)) {
        errors.push('Account number must be in format A-XXXXXXXX (e.g., A-12345678)');
      }

      // API key validation: sk_live_ prefix followed by 20+ alphanumeric characters
      const apiKeyPattern = /^sk_live_[a-zA-Z0-9]{20,}$/;
      const sanitizedApiKey = apiKey?.trim() || '';

      if (!sanitizedApiKey) {
        errors.push('API key is required');
      } else if (!apiKeyPattern.test(sanitizedApiKey)) {
        errors.push('API key must start with sk_live_ followed by at least 20 alphanumeric characters');
      }

      // Additional security checks
      if (sanitizedApiKey && sanitizedApiKey.length > 200) {
        errors.push('API key exceeds maximum length');
      }
      if (sanitizedAccount && sanitizedAccount.length > 20) {
        errors.push('Account number exceeds maximum length');
      }

      // Check for injection attempts (SQL, script tags, etc.)
      const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /['";]/];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitizedApiKey) || pattern.test(sanitizedAccount)) {
          errors.push('Invalid characters detected');
          break;
        }
      }

      return { valid: errors.length === 0, errors };
    }

    // --- CREDENTIALS MANAGEMENT ---

    if (action === 'save-credentials') {
      // Rate limiting check
      const rateLimit = checkRateLimit(userId, 'save-credentials');
      if (!rateLimit.allowed) {
        logSecurityEvent({
          type: 'RATE_LIMIT',
          severity: 'MEDIUM',
          details: {
            user_id: userId.substring(0, 8) + '...',
            action: 'save-credentials',
            ip: clientIP,
            retry_after: rateLimit.retryAfter,
            message: 'Rate limit exceeded for credential save attempt',
          },
          timestamp: new Date().toISOString(),
        });
        return new Response(
          JSON.stringify({
            error: 'Too many attempts. Please try again later.',
            retry_after: rateLimit.retryAfter
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(rateLimit.retryAfter)
            }
          }
        );
      }

      const { apiKey, accountNumber } = payload;

      // Server-side validation
      const validation = validateCredentials(apiKey, accountNumber);
      if (!validation.valid) {
        logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          severity: validation.errors.some(e => e.includes('Invalid characters')) ? 'HIGH' : 'LOW',
          details: {
            user_id: userId.substring(0, 8) + '...',
            ip: clientIP,
            errors: validation.errors,
            message: validation.errors.some(e => e.includes('Invalid characters'))
              ? 'Potential injection attempt detected'
              : 'Credential format validation failed',
          },
          timestamp: new Date().toISOString(),
        });
        return new Response(
          JSON.stringify({ error: 'Invalid credentials format', details: validation.errors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sanitize inputs before storage
      const sanitizedApiKey = apiKey.trim();
      const sanitizedAccountNumber = accountNumber.trim().toUpperCase();

      // Upsert credentials
      const { error } = await supabase
        .from('octopus_credentials')
        .upsert({
          user_id: userId,
          api_key: sanitizedApiKey,
          account_number: sanitizedAccountNumber,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving credentials:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- DATA MIGRATION (after sign-in) ---
    // This action migrates orphaned Octopus data to the authenticated user's account
    if (action === 'migrate-data') {
      const { previousUserId } = payload;

      if (!previousUserId) {
        return new Response(
          JSON.stringify({ error: 'Previous user ID required for migration' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${requestId}] Migrating Octopus data from ${previousUserId.substring(0, 8)}... to ${userId.substring(0, 8)}...`);

      let migratedCredentials = false;
      let migratedMeters = 0;
      let consumptionRecords = 0;
      let footprintRecords = 0;

      // 1. Check if user already has credentials - don't overwrite
      const { data: existingCreds } = await supabase
        .from('octopus_credentials')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!existingCreds) {
        // Migrate credentials from previous user
        const { data: oldCreds, error: oldCredsError } = await supabase
          .from('octopus_credentials')
          .select('*')
          .eq('user_id', previousUserId)
          .single();

        if (oldCreds && !oldCredsError) {
          const { error: insertError } = await supabase
            .from('octopus_credentials')
            .insert({
              user_id: userId,
              api_key: oldCreds.api_key,
              account_number: oldCreds.account_number,
              created_at: oldCreds.created_at,
              updated_at: new Date().toISOString()
            });

          if (!insertError) {
            migratedCredentials = true;
            // Delete old credentials
            await supabase
              .from('octopus_credentials')
              .delete()
              .eq('user_id', previousUserId);
          }
        }
      }

      // 2. Migrate meters
      const { data: oldMeters } = await supabase
        .from('octopus_meters')
        .select('*')
        .eq('user_id', previousUserId);

      if (oldMeters && oldMeters.length > 0) {
        for (const meter of oldMeters) {
          // Check if this meter already belongs to current user
          const { data: existingMeter } = await supabase
            .from('octopus_meters')
            .select('id')
            .eq('mpan', meter.mpan)
            .eq('user_id', userId)
            .single();

          if (!existingMeter) {
            // Update meter ownership to new user
            const { error: updateError } = await supabase
              .from('octopus_meters')
              .update({ user_id: userId, updated_at: new Date().toISOString() })
              .eq('id', meter.id);

            if (!updateError) {
              migratedMeters++;

              // Count consumption records for this meter
              const { count: consCount } = await supabase
                .from('octopus_consumption')
                .select('*', { count: 'exact', head: true })
                .eq('mpan', meter.mpan);
              consumptionRecords += consCount || 0;

              // Count footprint records for this meter
              const { count: fpCount } = await supabase
                .from('carbon_footprint')
                .select('*', { count: 'exact', head: true })
                .eq('mpan', meter.mpan);
              footprintRecords += fpCount || 0;
            }
          }
        }
      }

      console.log(`[${requestId}] Migration complete: creds=${migratedCredentials}, meters=${migratedMeters}, consumption=${consumptionRecords}, footprint=${footprintRecords}`);

      return new Response(
        JSON.stringify({
          success: true,
          migrated: {
            credentials: migratedCredentials,
            meters: migratedMeters,
            consumption_records: consumptionRecords,
            footprint_records: footprintRecords
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect-account') {
      const { error: credsError } = await supabase
        .from('octopus_credentials')
        .delete()
        .eq('user_id', userId);

      if (credsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.from('octopus_meters').delete().eq('user_id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to get credentials
    async function getUserCredentials() {
      const { data, error } = await supabase
        .from('octopus_credentials')
        .select('api_key, account_number')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }
      return data;
    }

    if (action === 'check-credentials') {
      const creds = await getUserCredentials();
      return new Response(
        JSON.stringify({ has_credentials: !!creds }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- REQUIRES CREDENTIALS ---

    // For all other actions, we need credentials
    const credentials = await getUserCredentials();

    // Allow get-status to run even without credentials (it will return unlinked state)
    // But other actions should fail if no credentials
    if (!credentials && action !== 'get-status') {
      // For greenness-forecast without creds, return empty gracefully
      if (action === 'get-greenness-forecast') {
        return new Response(
          JSON.stringify({ forecast: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Octopus Energy credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { api_key: OCTOPUS_API_KEY, account_number: OCTOPUS_ACCOUNT_NUMBER } = credentials || {};
    const authHeaderOctopus = OCTOPUS_API_KEY ? 'Basic ' + btoa(OCTOPUS_API_KEY + ':') : null;

    if (action === 'get-meters') {
      if (!authHeaderOctopus || !OCTOPUS_ACCOUNT_NUMBER) throw new Error('Missing credentials');

      // Fetch account details to get meter information
      const accountUrl = `https://api.octopus.energy/v1/accounts/${OCTOPUS_ACCOUNT_NUMBER}/`;
      console.log(`Fetching account from: ${accountUrl}`);

      const response = await fetch(accountUrl, {
        headers: { 'Authorization': authHeaderOctopus }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Octopus API error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: `Failed to fetch account: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accountData = await response.json();

      // Extract electricity meters
      const meters: { mpan: string; serial_number: string }[] = [];

      for (const property of accountData.properties || []) {
        for (const meterPoint of property.electricity_meter_points || []) {
          for (const meter of meterPoint.meters || []) {
            if (meterPoint.mpan && meter.serial_number) {
              meters.push({
                mpan: meterPoint.mpan,
                serial_number: meter.serial_number
              });
            }
          }
        }
      }

      console.log(`Found ${meters.length} electricity meters for user ${userId}`);

      // Store meters in database linked to user
      for (const meter of meters) {
        const { error } = await supabase
          .from('octopus_meters')
          .upsert({
            user_id: userId, // Link to user
            mpan: meter.mpan,
            serial_number: meter.serial_number,
            is_active: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'mpan' }); // Assumes MPAN is unique system-wide, which is true. 
        // If user A claims it, User B can't claim same MPAN unless we change constraint.
        // For now, MPAN is globally unique so this is fine.

        if (error) {
          console.error(`Error storing meter ${meter.mpan}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ meters }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync-consumption') {
      if (!authHeaderOctopus) throw new Error('Missing credentials');

      // Get meter details for THIS user
      const { data: meterData, error: meterError } = await supabase
        .from('octopus_meters')
        .select('*')
        .eq('user_id', userId) // Enforce user ownership
        .eq('is_active', true)
        .limit(1)
        .single();

      if (meterError || !meterData) {
        console.error('No active meter found for user:', meterError);
        return new Response(
          JSON.stringify({ error: 'No linked meter found. Please link your meter first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { mpan, serial_number } = meterData;

      // Calculate date range
      const daysBack = days;
      const periodTo = new Date();
      const periodFrom = new Date();
      periodFrom.setDate(periodFrom.getDate() - daysBack);

      const consumptionUrl = `https://api.octopus.energy/v1/electricity-meter-points/${mpan}/meters/${serial_number}/consumption/?period_from=${periodFrom.toISOString()}&period_to=${periodTo.toISOString()}&page_size=25000`;

      console.log(`Fetching consumption for ${mpan}`);

      const response = await fetch(consumptionUrl, {
        headers: { 'Authorization': authHeaderOctopus }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Octopus API error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: `Failed to fetch consumption: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const consumptionData = await response.json();
      const readings: OctopusConsumption[] = consumptionData.results || [];

      console.log(`Received ${readings.length} consumption readings`);

      // Store consumption data
      let insertedCount = 0;
      for (const reading of readings) {
        const { error } = await supabase
          .from('octopus_consumption')
          .upsert({
            interval_start: reading.interval_start,
            interval_end: reading.interval_end,
            consumption_kwh: reading.consumption,
            mpan,
            serial_number
          }, { onConflict: 'mpan,interval_start' });

        if (!error) insertedCount++;
      }

      // Update last sync time
      await supabase
        .from('octopus_meters')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('mpan', mpan)
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          success: true,
          readings_synced: insertedCount,
          period_from: periodFrom.toISOString(),
          period_to: periodTo.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to map MPAN Area Code (first 2 digits) to NESO Carbon Region ID
    function getRegionIdFromMpan(mpan: string): number | null {
      if (!mpan || mpan.length < 2) return null;
      const areaCode = mpan.substring(0, 2);
      const mapping: Record<string, number> = {
        '10': 10, '11': 9, '12': 13, '13': 6, '14': 8, '15': 4, '16': 3,
        '17': 2, '18': 1, '19': 12, '20': 11, '21': 7, '22': 14, '23': 5,
      };
      return mapping[areaCode] || null;
    }

    if (action === 'calculate-footprint') {

      // Find user's MPAN first to get the correct consumption data
      const { data: userMeter } = await supabase
        .from('octopus_meters')
        .select('mpan')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!userMeter) {
        return new Response(
          JSON.stringify({ error: 'No meter linked' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get consumption data for this user's MPAN
      const { data: consumption, error: consumptionError } = await supabase
        .from('octopus_consumption')
        .select('*')
        .eq('mpan', userMeter.mpan)
        .order('interval_start', { ascending: false })
        .limit(500);

      if (consumptionError || !consumption?.length) {
        return new Response(
          JSON.stringify({ error: 'No consumption data found. Please sync consumption first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Determine Date Range
      // Consumption is ordered by interval_start DESC (latest first)
      const lastRecord = consumption[0]; // Latest time
      const firstRecord = consumption[consumption.length - 1]; // Earliest time

      const minTime = new Date(firstRecord.interval_start);
      const maxTime = new Date(lastRecord.interval_end);

      const fromStr = minTime.toISOString();
      const toStr = maxTime.toISOString();

      // 2. Determine Region
      const mpan = consumption[0].mpan;
      const regionId = getRegionIdFromMpan(mpan);

      let intensityUrl = `https://api.carbonintensity.org.uk/intensity/${fromStr}/${toStr}`;
      let isRegional = false;

      if (regionId) {
        intensityUrl = `https://api.carbonintensity.org.uk/regional/intensity/${fromStr}/${toStr}/regionid/${regionId}`;
        isRegional = true;
      }

      const intensityMap = new Map<string, { intensity: number, index: string }>();

      try {
        const intensityResponse = await fetch(intensityUrl);
        if (!intensityResponse.ok) throw new Error(`Failed to fetch batch intensity: ${intensityResponse.status}`);

        const intensityJson = await intensityResponse.json();
        let intensityList: any[] = [];

        if (isRegional) {
          // Check nested structure carefully
          if (Array.isArray(intensityJson.data)) {
            // Sometimes regional API returns array of regions, we want the first (and only) one if we requested by ID
            intensityList = intensityJson.data[0]?.data || [];
          } else {
            // Or direct object
            intensityList = intensityJson.data?.data || [];
          }
        } else {
          intensityList = intensityJson.data || [];
        }

        for (const item of intensityList) {
          if (item.from && item.intensity) {
            const value = item.intensity.actual ?? item.intensity.forecast ?? 0;
            const index = item.intensity.index || 'moderate';
            intensityMap.set(item.from, { intensity: value, index });
          }
        }

      } catch (error) {
        console.error('Batch fetch failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch external carbon data' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Process records
      let calculatedCount = 0;
      const footprintRecords: FootprintRecord[] = [];

      for (const record of consumption) {
        const data = intensityMap.get(record.interval_start);

        if (data) {
          const carbonG = record.consumption_kwh * data.intensity;

          footprintRecords.push({
            interval_start: record.interval_start,
            interval_end: record.interval_end,
            consumption_kwh: record.consumption_kwh,
            intensity_gco2_kwh: data.intensity,
            carbon_g: carbonG,
            intensity_index: data.index,
            mpan: record.mpan
          });
        }
      }

      // 4. Batch Insert
      if (footprintRecords.length > 0) {
        const { error } = await supabase
          .from('carbon_footprint')
          .upsert(footprintRecords, { onConflict: 'mpan,interval_start' });

        if (!error) calculatedCount = footprintRecords.length;
      }

      return new Response(
        JSON.stringify({
          success: true,
          records_calculated: calculatedCount,
          region_used: isRegional ? regionId : 'national'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-footprint') {
      const { data: userMeter } = await supabase
        .from('octopus_meters')
        .select('mpan')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!userMeter) {
        return new Response(
          JSON.stringify({ records: [], summary: {} }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const periodFrom = new Date();
      periodFrom.setDate(periodFrom.getDate() - days);

      const { data: footprint, error } = await supabase
        .from('carbon_footprint')
        .select('*')
        .eq('mpan', userMeter.mpan)
        .gte('interval_start', periodFrom.toISOString())
        .order('interval_start', { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch footprint data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate summary stats
      const totalCarbonG = footprint?.reduce((sum: number, r: FootprintRecord) => sum + Number(r.carbon_g), 0) || 0;
      const totalKwh = footprint?.reduce((sum: number, r: FootprintRecord) => sum + Number(r.consumption_kwh), 0) || 0;
      const avgIntensity = footprint?.length
        ? footprint.reduce((sum: number, r: FootprintRecord) => sum + r.intensity_gco2_kwh, 0) / footprint.length
        : 0;

      const byIndex: Record<string, { count: number; carbon_g: number; kwh: number }> = {};
      for (const record of footprint || []) {
        const idx = record.intensity_index;
        if (!byIndex[idx]) byIndex[idx] = { count: 0, carbon_g: 0, kwh: 0 };
        byIndex[idx].count++;
        byIndex[idx].carbon_g += Number(record.carbon_g);
        byIndex[idx].kwh += Number(record.consumption_kwh);
      }

      return new Response(
        JSON.stringify({
          records: footprint,
          summary: {
            total_carbon_kg: totalCarbonG / 1000,
            total_kwh: totalKwh,
            avg_intensity: Math.round(avgIntensity),
            by_intensity_index: byIndex,
            period_days: days
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-greenness-forecast') {
      // This endpoint requires authentication with Octopus API
      if (!authHeaderOctopus) {
        return new Response(
          JSON.stringify({ forecast: [], error: 'Octopus credentials required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const query = `
        query GreennessForecast {
          greennessForecast {
            validFrom
            validTo
            greennessScore
            greennessIndex
            highlightFlag
          }
        }
      `;

      try {
        const response = await fetch('https://api.octopus.energy/v1/graphql/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeaderOctopus
          },
          body: JSON.stringify({ query, operationName: 'GreennessForecast' })
        });

        if (!response.ok) {
          console.error(`Greenness forecast API error: ${response.status}`);
          // Return empty forecast instead of failing - this is non-critical data
          return new Response(
            JSON.stringify({ forecast: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();
        if (result.errors) {
          console.error('GraphQL errors:', result.errors);
          return new Response(
            JSON.stringify({ forecast: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ forecast: result.data?.greennessForecast || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Greenness forecast error:', message);
        // Return empty array for graceful degradation
        return new Response(
          JSON.stringify({ forecast: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- INTELLIGENT DISPATCH SLOTS ---
    // Fetch planned and completed charging dispatches for Octopus Intelligent tariffs
    if (action === 'get-intelligent-dispatches') {
      if (!authHeaderOctopus || !OCTOPUS_ACCOUNT_NUMBER) {
        return new Response(
          JSON.stringify({ planned: [], completed: [], error: 'Octopus credentials required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's meter to store with dispatches
      const { data: userMeter } = await supabase
        .from('octopus_meters')
        .select('mpan')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!userMeter) {
        return new Response(
          JSON.stringify({ planned: [], completed: [], error: 'No meter linked' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const mpan = userMeter.mpan;
      const dispatchUrl = `https://api.octopus.energy/v1/accounts/${OCTOPUS_ACCOUNT_NUMBER}/electricity-meter-points/${mpan}/intelligent-dispatches/`;

      console.log(`[${requestId}] Fetching Intelligent dispatches for MPAN ${mpan.substring(0, 4)}...`);

      try {
        const response = await fetch(dispatchUrl, {
          headers: { 'Authorization': authHeaderOctopus }
        });

        if (!response.ok) {
          // 404 means user doesn't have Intelligent tariff - this is fine
          if (response.status === 404) {
            console.log(`[${requestId}] No Intelligent tariff found for account`);
            return new Response(
              JSON.stringify({ planned: [], completed: [], message: 'Intelligent tariff not detected' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.error(`Intelligent dispatch API error: ${response.status}`);
          return new Response(
            JSON.stringify({ planned: [], completed: [], error: `API error: ${response.status}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        const plannedDispatches = data.plannedDispatches || [];
        const completedDispatches = data.completedDispatches || [];

        console.log(`[${requestId}] Found ${plannedDispatches.length} planned, ${completedDispatches.length} completed dispatches`);

        // Store dispatches in database for history and notifications
        const dispatchesToUpsert: any[] = [];
        const newCompletedStarts: string[] = [];

        // Check for newly started dispatches (for notifications)
        const now = new Date();

        for (const dispatch of plannedDispatches) {
          dispatchesToUpsert.push({
            user_id: userId,
            mpan,
            dispatch_type: 'planned',
            start_time: dispatch.start || dispatch.startDt,
            end_time: dispatch.end || dispatch.endDt,
            charge_kwh: dispatch.chargeKwh || null,
            source: dispatch.source || null,
            location: dispatch.location || null,
            updated_at: new Date().toISOString()
          });
        }

        // Fetch carbon intensity for completed dispatches to calculate savings
        // UK average grid intensity ~230 gCO2/kWh as baseline
        const UK_AVG_INTENSITY = 230;

        for (const dispatch of completedDispatches) {
          const startTime = new Date(dispatch.start || dispatch.startDt);
          const endTime = new Date(dispatch.end || dispatch.endDt);
          const chargeKwh = dispatch.chargeKwh || 0;

          let avgIntensity: number | null = null;
          let carbonUsedG: number | null = null;
          let carbonSavedG: number | null = null;

          // Calculate carbon data if we have energy data
          if (chargeKwh > 0) {
            try {
              const isoFrom = startTime.toISOString();
              const isoTo = endTime.toISOString();
              const intensityUrl = `https://api.carbonintensity.org.uk/intensity/${isoFrom}/${isoTo}`;
              const intensityRes = await fetch(intensityUrl);
              
              if (intensityRes.ok) {
                const intensityJson = await intensityRes.json();
                const intervals = intensityJson.data || [];
                
                if (intervals.length > 0) {
                  const totalIntensity = intervals.reduce((sum: number, i: any) => 
                    sum + (i.intensity?.actual ?? i.intensity?.forecast ?? 0), 0);
                  avgIntensity = Math.round(totalIntensity / intervals.length);
                  carbonUsedG = Math.round(chargeKwh * avgIntensity * 100) / 100;
                  carbonSavedG = Math.round((chargeKwh * UK_AVG_INTENSITY - carbonUsedG) * 100) / 100;
                }
              }
            } catch (err) {
              console.warn(`[${requestId}] Failed to fetch intensity for dispatch:`, err);
            }
          }

          dispatchesToUpsert.push({
            user_id: userId,
            mpan,
            dispatch_type: 'completed',
            start_time: dispatch.start || dispatch.startDt,
            end_time: dispatch.end || dispatch.endDt,
            charge_kwh: chargeKwh || null,
            source: dispatch.source || null,
            location: dispatch.location || null,
            avg_intensity_gco2: avgIntensity,
            carbon_used_g: carbonUsedG,
            carbon_saved_g: carbonSavedG,
            updated_at: new Date().toISOString()
          });

          // Track if this is a recently started dispatch (within last 10 mins)
          const timeSinceStart = now.getTime() - startTime.getTime();
          if (timeSinceStart >= 0 && timeSinceStart < 10 * 60 * 1000) {
            newCompletedStarts.push(dispatch.start || dispatch.startDt);
          }
        }

        // Upsert dispatches
        if (dispatchesToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('octopus_intelligent_dispatches')
            .upsert(dispatchesToUpsert, { 
              onConflict: 'user_id,mpan,dispatch_type,start_time',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            console.error('Error storing dispatches:', upsertError);
          }
        }

        // Check for dispatches that just started and haven't been notified
        let chargingStarted = false;
        let chargingStartDispatch = null;

        if (newCompletedStarts.length > 0) {
          // Check if we already notified for these
          const { data: unnotified } = await supabase
            .from('octopus_intelligent_dispatches')
            .select('*')
            .eq('user_id', userId)
            .eq('dispatch_type', 'completed')
            .in('start_time', newCompletedStarts)
            .is('notified_at', null);

          if (unnotified && unnotified.length > 0) {
            chargingStarted = true;
            chargingStartDispatch = unnotified[0];

            // Mark as notified
            await supabase
              .from('octopus_intelligent_dispatches')
              .update({ notified_at: new Date().toISOString() })
              .eq('user_id', userId)
              .in('start_time', newCompletedStarts)
              .is('notified_at', null);
          }
        }

        return new Response(
          JSON.stringify({
            planned: plannedDispatches,
            completed: completedDispatches,
            chargingStarted,
            chargingStartDispatch: chargingStartDispatch ? {
              startTime: chargingStartDispatch.start_time,
              endTime: chargingStartDispatch.end_time,
              source: chargingStartDispatch.source
            } : null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Intelligent dispatch error:', message);
        return new Response(
          JSON.stringify({ planned: [], completed: [], error: message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'get-status') {
      // Get meter status for current user
      const { data: meters } = await supabase
        .from('octopus_meters')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Get latest consumption
      let latestConsumption = null;
      let footprintCount = 0;

      if (meters && meters.length > 0) {
        // Assuming single meter for simplicity in status check, or check all
        const mpans = meters.map((m: any) => m.mpan);

        const { data: latest } = await supabase
          .from('octopus_consumption')
          .select('interval_start')
          .in('mpan', mpans)
          .order('interval_start', { ascending: false })
          .limit(1);

        latestConsumption = latest?.[0]?.interval_start || null;

        const { count } = await supabase
          .from('carbon_footprint')
          .select('*', { count: 'exact', head: true })
          .in('mpan', mpans);

        footprintCount = count || 0;
      }

      return new Response(
        JSON.stringify({
          is_linked: meters && meters.length > 0,
          has_credentials: !!credentials,
          meters: meters || [],
          latest_consumption: latestConsumption,
          footprint_records: footprintCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Octopus Energy function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
