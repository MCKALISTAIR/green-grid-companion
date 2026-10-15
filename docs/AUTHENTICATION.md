# Authentication Flow Documentation

## Overview

GridSense supports both **anonymous** and **authenticated** users through Supabase authentication. Users can start using energy integrations immediately without signing in, and later upgrade to an authenticated account to enable cross-device sync.

## Authentication Types

### Anonymous Authentication

- **What**: Temporary Supabase session without OAuth provider
- **When**: Automatically created when user adds Octopus/Tesla credentials
- **Duration**: Persistent until user signs in or clears browser data
- **Unique ID**: Each anonymous session gets a unique user ID
- **Data**: All integrations, credentials, and footprint data stored normally

### Authenticated Authentication

- **What**: OAuth-based authentication (Google or Apple)
- **When**: User explicitly clicks "Continue with Google/Apple"
- **Benefits**: Cross-device sync, data backup, account recovery
- **Migration**: Automatically transfers anonymous data to authenticated account

## User Flows

### New User (No Sign-In)

```
1. User opens app
2. Navigates to Settings
3. Adds Octopus Energy credentials
4. App calls ensureAuthSession()
   └─> Creates anonymous Supabase session
5. Credentials saved with anonymous user_id
6. ✓ Integration works immediately
7. Settings shows "Backup Your Data" card
```

### Sign-In Flow (From Anonymous)

```
1. Anonymous user with existing data
2. Clicks "Continue with Google/Apple"
3. AccountBackup stores anonymous user_id in localStorage
4. OAuth redirect & completion
5. AccountBackup detects SIGNED_IN event
6. Calls migrate-data edge function
   └─> Transfers credentials, meters, consumption, footprint
7. Toast: "Restored your Octopus data: X meters, Y records"
8. ✓ All data now linked to authenticated account
9. "Backup Your Data" becomes "Data Backup Active"
```

### Sign-Out Flow

```
1. User clicks "Sign Out"
2. AccountBackup stores current user_id for future migration
3. User is signed out
4. App continues to work (can create new anonymous session)
```

## Implementation Details

### Core Utilities (`src/lib/auth-utils.ts`)

#### `ensureAuthSession()`

Ensures the user has a valid Supabase session, creating an anonymous one if needed.

```typescript
import { ensureAuthSession } from '@/lib/auth-utils';

// Before any edge function call
await ensureAuthSession();
```

**Returns**: `Promise<Session>` - Current or newly created session
**Throws**: Error if session creation fails

**Use Cases:**

- Before saving credentials (Octopus, Tesla)
- Before fetching integration status
- Before any authenticated API call

#### `isAuthenticated()`

Check if current user is authenticated (not anonymous).

```typescript
const authenticated = await isAuthenticated();
if (!authenticated) {
  // Show "Backup Your Data" prompt
}
```

**Returns**: `Promise<boolean>` - true if Google/Apple authenticated

#### `getCurrentUserId()`

Get the current user ID (anonymous or authenticated).

```typescript
const userId = await getCurrentUserId();
```

**Returns**: `Promise<string | null>` - User ID or null

#### `shouldPromptForAuth()`

Determine if we should encourage user to sign in.

```typescript
const shouldPrompt = await shouldPromptForAuth();
// Returns true for anonymous users who have been using app
```

### Integration Hooks

Both `useOctopusEnergy` and `useTeslaEnergy` have been updated:

**Before:**

```typescript
// Required authenticated session
const { hasSession } = useState(false);
if (!hasSession) {
  // Block user from using integrations
}
```

**After:**

```typescript
// No session requirement
const saveCredentials = async () => {
  await ensureAuthSession(); // Creates anon session if needed
  // Save credentials...
};
```

### Migration System (`AccountBackup.tsx`)

The migration system was already built and now works seamlessly with anonymous auth:

1. **Before Sign-In**: Stores `octopus-anon-user-id` in localStorage
2. **On SIGNED_IN Event**: Reads stored anonymous ID
3. **Calls `migrate-data`**: Edge function transfers all data
4. **Updates UI**: Shows success toast, clears anonymous ID

**No changes were needed** to AccountBackup - it already handled everything!

### Edge Functions

Both `octopus-energy` and `tesla-energy` edge functions:

- ✅ Already accept anonymous JWT tokens
- ✅ Validate token using `supabase.auth.getUser(token)`
- ✅ Work identically for anonymous and authenticated users
- ✅ `migrate-data` action transfers data between users

**No changes were needed** to edge functions!

## Security

### Anonymous Session Safety

- ✅ Each anonymous user gets unique UUID
- ✅ JWT tokens expire and refresh normally
- ✅ Cannot access other users' data (enforced by user_id)
- ✅ Migration validates ownership via localStorage

### Data Isolation

- ✅ RLS (Row Level Security) policies enforce user_id matching
- ✅ Edge functions use service role key but validate user identity
- ✅ Anonymous users cannot see authenticated users' data

### Migration Security

- ✅ Only migrates if user has stored anonymous ID (same device)
- ✅ Cannot hijack another user's data
- ✅ One-time migration (clears ID after completion)

## Database Implications

### Anonymous User Records

Anonymous users create normal database records:

- `octopus_credentials` table: user_id = anonymous UUID
- `octopus_meters` table: user_id = anonymous UUID
- `octopus_consumption` table: linked by MPAN
- `carbon_footprint` table: linked by MPAN

### Session Expiry

Supabase anonymous sessions can be configured to expire:

- **Default**: Never expires (persists until sign-in or clear data)
- **Recommended**: 90-day expiry
- **After Expiry**: Records become orphaned (not deleted)

### Cleanup Strategy (Future)

Consider implementing:

- Background job to delete orphaned anonymous data after 180 days
- Or: Keep anonymous data indefinitely (storage is cheap)

## Testing

### Manual Test Plan

#### Test 1: Fresh Anonymous User

```bash
# 1. Clear all data
localStorage.clear()
# 2. Open Settings
# 3. Add Octopus credentials
# 4. Verify:
- ✓ Integration works
- ✓ Can link meters
- ✓ Can sync consumption
- ✓ Footprint tab shows data
- ✓ No sign-in required
```

#### Test 2: Migration Flow

```bash
# 1. As anonymous user with credentials
# 2. Click "Continue with Google"
# 3. Complete OAuth
# 4. Verify:
- ✓ Toast shows "Restored your Octopus data..."
- ✓ All data still visible
- ✓ Database shows new user_id
- ✓ "Backup Your Data" → "Data Backup Active"
```

#### Test 3: Sign Out & Back In

```bash
# 1. As authenticated user
# 2. Click "Sign Out"
# 3. Add new credentials (creates new anon session)
# 4. Sign in again with same Google account
# 5. Verify:
- ✓ Latest data migrated
- ✓ No duplicate records
```

### Edge Cases

| Scenario                                    | Expected Behavior                              |
| ------------------------------------------- | ---------------------------------------------- |
| Anonymous user clears browser data          | Loses all data (acceptable)                    |
| Anonymous user signs in on different device | No migration (data only on original device)    |
| User creates multiple anonymous sessions    | Each session independent (unlikely but safe)   |
| Anonymous user never signs in               | Works indefinitely (until session expires)     |
| Authenticated user signs out then back in   | No migration attempted (already authenticated) |

## Troubleshooting

### "Failed to create authentication session"

**Cause**: Supabase anonymous auth might be disabled
**Solution**: Enable anonymous auth in Supabase dashboard → Authentication → Providers

### "Migration failed" or no toast after sign-in

**Cause**: Anonymous user ID not in localStorage
**Solution**: Expected on different devices - data only migrates on same device

### Anonymous sessions not persisting

**Cause**: Browser is clearing cookies/local storage aggressively
**Solution**: User should allow cookies for the site

### Orphaned data accumulating

**Cause**: Many anonymous users never converting to authenticated
**Solution**: Implement cleanup job (future enhancement)

## Metrics to Track (Future)

Consider tracking:

- Anonymous → Authenticated conversion rate
- Time from first anonymous use to authentication
- Number of orphaned anonymous records
- Storage usage by anonymous vs authenticated users

## FAQ

**Q: Can anonymous users access all features?**
A: Yes! Anonymous users have full access to integrations. The only difference is cross-device sync.

**Q: What happens if user never signs in?**
A: They can use the app indefinitely as an anonymous user. All features work.

**Q: Can users have data on multiple devices?**
A: Only if they sign in. Anonymous sessions are device-specific.

**Q: Is anonymous data secure?**
A: Yes. Each anonymous session has a unique UUID and cannot access other users' data.

**Q: Can we disable anonymous auth later?**
A: Yes, but existing anonymous users would be blocked. Better to keep it enabled.

**Q: What about GDPR/data retention?**
A: Anonymous data can be cleaned up after session expiry. Consider 90-day expiry + 180-day cleanup.

## Related Files

- **`src/lib/auth-utils.ts`** - Anonymous session utilities
- **`src/hooks/useOctopusEnergy.ts`** - Octopus integration with anon support
- **`src/hooks/useTeslaEnergy.ts`** - Tesla integration with anon support
- **`src/components/AccountBackup.tsx`** - Handles migration on sign-in
- **`supabase/functions/octopus-energy/index.ts`** - Edge function with migrate-data action
- **`supabase/functions/tesla-energy/index.ts`** - Tesla edge function

## Summary

The anonymous authentication implementation enables:

- ✅ **Immediate value**: Users can use integrations without sign-in friction
- ✅ **Seamless upgrade**: One-click migration when users authenticate
- ✅ **Secure**: Same security model as authenticated users
- ✅ **Simple**: No database schema changes, minimal code changes
- ✅ **Future-proof**: Easy to add cleanup jobs or expire sessions later

The existing migration infrastructure made this implementation trivial - we just needed to ensure sessions exist before edge function calls!
