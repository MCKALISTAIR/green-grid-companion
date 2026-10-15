# Quick Test Guide - Anonymous Authentication

## Before you deploy, test these scenarios:

### ✅ Test 1: Fresh User (2 minutes)

1. Open DevTools → Application → Clear all storage
2. Open http://localhost:8080
3. Navigate to Settings (bottom nav)
4. Click "Energy Integrations" section
5. Enter Octopus credentials:
   - Account Number: `A-12345678` (example)
   - API Key: `sk_live_abcdefghijklmnopqrstuvwxyz123456` (example)
6. Click "Save"

**Expected Result:**

- ✅ No sign-in prompt
- ✅ Success toast appears
- ✅ "Link Meter" button becomes available
- ✅ Settings show "Backup Your Data" card
- ✅ Console shows: "Creating anonymous authentication session"
- ✅ Console shows: "Anonymous session created successfully"

**If Failed:**

- Check Supabase Dashboard → Authentication → Providers → Anonymous sign-ins is enabled
- Check console for error messages
- Verify edge function is accessible

---

### ✅ Test 2: Sign-In Migration (3 minutes)

**Prerequisites:** Complete Test 1 first

1. Still in Settings page
2. Scroll to "Backup Your Data" card
3. Click "Continue with Google"
4. Complete Google OAuth
5. Return to app

**Expected Result:**

- ✅ Toast: "Restored your Octopus data: X meters, Y records"
- ✅ Credentials still saved
- ✅ "Backup Your Data" → "Data Backup Active"
- ✅ Email address visible
- ✅ Console shows migration details

**If Failed:**

- Check localStorage for `octopus-anon-user-id`
- Check edge function logs for `migrate-data` action
- Verify AccountBackup.tsx is listening to auth changes

---

### ✅ Test 3: Already Authenticated (1 minute)

**Prerequisites:** Be signed in from Test 2

1. Refresh page
2. Navigate to Settings

**Expected Result:**

- ✅ Shows "Data Backup Active"
- ✅ Email address displayed
- ✅ Integration still works
- ✅ No migration toast (already migrated)

---

### ✅ Test 4: Sign Out (1 minute)

**Prerequisites:** Be signed in from Test 2

1. In Settings, click "Sign Out"
2. Observe UI changes

**Expected Result:**

- ✅ "Data Backup Active" → "Backup Your Data"
- ✅ App still works fully
- ✅ Can add new credentials without sign-in
- ✅ Console may show new anonymous session creation

---

## Console Monitoring

Watch for these log messages:

### Good Signs ✅

```
[INFO] Creating anonymous authentication session
[INFO] Anonymous session created successfully, userId: 1a2b3c4d...
[DEBUG] Auth session exists, isAnonymous: true
```

### Success Migration ✅

```
Migration complete: creds=true, meters=1, consumption=500, footprint=7
Restored your Octopus data: 1 meter(s), 7 footprint records
```

### Bad Signs ❌

```
Failed to create anonymous session
Unauthorized
401 - Missing Authorization header
```

---

## Supabase Dashboard Check

### Before Testing

1. Go to Supabase Dashboard → Authentication → Providers
2. Ensure "Anonymous sign-ins" is **ENABLED**
3. Optional: Set "Session expiry" to 90 days

### After Test 1

1. Go to Authentication → Users
2. Should see new user with:
   - ID: Random UUID
   - Email: null
   - Is Anonymous: true
   - Created: Just now

### After Test 2

1. Go to Authentication → Users
2. Should see:
   - Your Google account (authenticated)
   - Anonymous user may still exist (can be cleaned up later)

### Database Check

1. Go to Table Editor → `octopus_credentials`
2. After Test 1: user_id = anonymous UUID
3. After Test 2: user_id = authenticated UUID
4. Should see credentials transferred

---

## Edge Function Testing

Test edge function directly:

```bash
# Get your auth token from DevTools Application → Local Storage → sb-<project>-auth-token

curl -X POST https://your-project.supabase.co/functions/v1/octopus-energy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"get-status"}'
```

**Expected:** Should work for both anonymous and authenticated tokens

---

## Common Issues & Fixes

| Issue                          | Cause                          | Fix                                            |
| ------------------------------ | ------------------------------ | ---------------------------------------------- |
| "Missing Authorization header" | ensureAuthSession() not called | Check hooks have await ensureAuthSession()     |
| "Failed to create session"     | Anonymous auth disabled        | Enable in Supabase dashboard                   |
| No migration toast             | localStorage cleared           | Expected - migration only works on same device |
| Credentials not saving         | Edge function error            | Check Supabase function logs                   |
| "401 Unauthorized"             | Token expired                  | Clear storage and try again                    |

---

## Quick Command Checklist

```bash
# 1. Check dev server is running
# http://localhost:8080 should be accessible

# 2. Clear browser data
# DevTools → Application → Clear site data

# 3. Open app
# Navigate to Settings

# 4. Try adding credentials
# No sign-in should be required

# 5. Check console logs
# Should see "Anonymous session created"

# 6. Sign in
# Should see migration toast

# 7. Verify data
# Integration should still work
```

---

## Success Indicators

All of these should be true:

- [ ] Can add Octopus credentials without signing in
- [ ] Integration works for anonymous users
- [ ] Sign-in shows migration toast
- [ ] Data persists after sign-in
- [ ] Sign-out doesn't break the app
- [ ] Console shows proper log messages
- [ ] Supabase shows anonymous users
- [ ] No breaking errors in production

---

## Ready to Deploy? ✅

Once all tests pass:

1. Ensure Supabase anonymous auth is enabled in production
2. Deploy to staging first
3. Run same tests on staging
4. Monitor Sentry for any auth errors
5. Deploy to production
6. Monitor user analytics

---

**Estimated Testing Time:** 10-15 minutes for full suite
**Minimum Testing Time:** 5 minutes for Test 1 & 2

Good luck! 🚀
