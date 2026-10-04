// Push Notification Utility for Deno Edge Functions
// Supports APNs (Apple Push Notification service) and FCM v1 (Firebase Cloud Messaging)

// Helper to convert PEM string to binary Der ArrayBuffer
function pemToDer(pem: string): Uint8Array {
  const cleanPem = pem
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s/g, "");
  
  const binaryString = atob(cleanPem);
  const der = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    der[i] = binaryString.charCodeAt(i);
  }
  return der;
}

// Helper to encode ArrayBuffer as base64url string
function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Generate ES256 JWT for APNs authentication
async function generateApnsJwt(privateKeyPem: string, keyId: string, teamId: string): Promise<string> {
  const der = pemToDer(privateKeyPem);
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"]
  );

  const header = {
    alg: "ES256",
    kid: keyId,
  };

  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  };

  const encoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const dataToSign = encoder.encode(`${encodedHeader}.${encodedPayload}`);

  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    key,
    dataToSign
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Generate RS256 JWT for Google OAuth2 authentication
async function generateGoogleJwt(clientEmail: string, privateKeyPem: string): Promise<string> {
  const der = pemToDer(privateKeyPem);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const dataToSign = encoder.encode(`${encodedHeader}.${encodedPayload}`);

  const signature = await crypto.subtle.sign(
    {
      name: "RSASSA-PKCS1-v1_5",
    },
    key,
    dataToSign
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Obtain Google OAuth2 token using the service account JWT
async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const jwt = await generateGoogleJwt(clientEmail, privateKeyPem);
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google OAuth token request failed: ${response.statusText} (${text})`);
  }

  const json = await response.json();
  return json.access_token;
}

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  platform?: string; // 'ios' | 'android' | 'web'
  isSandbox?: boolean;
}

export async function sendPushNotifications(notifications: PushNotificationPayload[]) {
  if (!notifications || notifications.length === 0) {
    console.log("[PUSH] No notifications to send.");
    return;
  }

  // Load APNs configuration
  const apnsKey = Deno.env.get("APNS_PRIVATE_KEY");
  const apnsKeyId = Deno.env.get("APNS_KEY_ID");
  const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
  const apnsBundleId = Deno.env.get("APNS_BUNDLE_ID") || "app.lovable.1558020f8a4c43dc9ea079533f5d485c";
  const apnsSandbox = Deno.env.get("APNS_USE_SANDBOX") === "true";

  // Load FCM configuration
  const fcmProjectId = Deno.env.get("FCM_PROJECT_ID");
  const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
  const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");

  const apnsConfigured = !!(apnsKey && apnsKeyId && apnsTeamId);
  const fcmConfigured = !!(fcmProjectId && fcmClientEmail && fcmPrivateKey);

  if (!apnsConfigured && !fcmConfigured) {
    console.warn(
      `[PUSH] Warning: Push notification credentials are not configured. APNS_PRIVATE_KEY/FCM_PRIVATE_KEY is missing. Notifications generated: ${notifications.length}. Logging them to console instead.`
    );
    notifications.forEach((n) => {
      console.log(`[PUSH MOCK] To: ${n.token.substring(0, 10)}... | Title: "${n.title}" | Body: "${n.body}"`);
    });
    return;
  }

  // Pre-generate tokens to avoid redundant crypto operations
  let apnsToken = "";
  if (apnsConfigured) {
    try {
      apnsToken = await generateApnsJwt(apnsKey, apnsKeyId, apnsTeamId);
      console.log("[PUSH] Generated APNs auth token.");
    } catch (e) {
      console.error("[PUSH] Failed to generate APNs JWT:", e);
    }
  }

  let fcmAccessToken = "";
  if (fcmConfigured) {
    try {
      fcmAccessToken = await getGoogleAccessToken(fcmClientEmail, fcmPrivateKey);
      console.log("[PUSH] Obtained FCM OAuth2 access token.");
    } catch (e) {
      console.error("[PUSH] Failed to obtain FCM OAuth2 token:", e);
    }
  }

  // Send notifications in parallel batches
  const promises = notifications.map(async (n) => {
    const platform = n.platform || "ios";

    // Standard APNs path (if direct APNs is configured for iOS platform)
    if (platform === "ios" && apnsConfigured && apnsToken) {
      const isSandbox = n.isSandbox !== undefined ? n.isSandbox : apnsSandbox;
      const apnsHost = isSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
      const url = `https://${apnsHost}/3/device/${n.token}`;
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "authorization": `bearer ${apnsToken}`,
            "apns-topic": apnsBundleId,
            "apns-push-type": "alert",
          },
          body: JSON.stringify({
            aps: {
              alert: {
                title: n.title,
                body: n.body,
              },
              sound: "default",
            },
          }),
        });

        if (response.ok) {
          console.log(`[PUSH] Sent APNs notification successfully to ${n.token.substring(0, 10)}...`);
        } else {
          const text = await response.text();
          console.error(`[PUSH] Failed APNs send to ${n.token.substring(0, 10)}... Status: ${response.status}. Reason: ${text}`);
        }
      } catch (err) {
        console.error(`[PUSH] APNs fetch error for ${n.token.substring(0, 10)}...`, err);
      }
    } 
    // Fallback to FCM for everything else, or if APNs is not configured
    else if (fcmConfigured && fcmAccessToken) {
      const url = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fcmAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: n.token,
              notification: {
                title: n.title,
                body: n.body,
              },
            },
          }),
        });

        if (response.ok) {
          console.log(`[PUSH] Sent FCM notification successfully to ${n.token.substring(0, 10)}...`);
        } else {
          const text = await response.text();
          console.error(`[PUSH] Failed FCM send to ${n.token.substring(0, 10)}... Status: ${response.status}. Reason: ${text}`);
        }
      } catch (err) {
        console.error(`[PUSH] FCM fetch error for ${n.token.substring(0, 10)}...`, err);
      }
    } else {
      console.warn(`[PUSH] No delivery pathway configured for platform ${platform} and token ${n.token.substring(0, 10)}...`);
    }
  });

  await Promise.all(promises);
}
