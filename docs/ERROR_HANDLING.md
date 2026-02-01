# Error Handling Guide

This guide explains how to provide user-friendly error messages throughout the GridSense application.

## The Problem

When Supabase edge functions fail, they often return generic error messages like:
- "Edge function returned a non-2xx status code"
- Raw HTTP status codes without context
- Server-side technical errors

These messages don't help users understand what went wrong or how to fix it.

## The Solution

We use the `parseEdgeFunctionError` utility from `@/lib/errorUtils` to transform technical errors into clear, actionable messages.

### Key Features

1. **Context-Aware Messages**: Different error messages based on what feature and action failed
2. **HTTP Status Code Mapping**: Translates 401, 403, 404, 500, etc. into meaningful explanations
3. **Offline Detection**: Checks for network connectivity before displaying errors
4. **Fallback Messaging**: Provides sensible defaults when specific errors can't be determined

## Usage

### Basic Usage

```typescript
import { parseEdgeFunctionError } from '@/lib/errorUtils';
import { toast } from 'sonner';

try {
  const { data, error } = await supabase.functions.invoke('some-function', {
    body: { action: 'do-something' }
  });
  
  if (error) throw error;
  
  // Success!
  toast.success('Action completed!');
} catch (error: unknown) {
  const message = parseEdgeFunctionError(error, {
    feature: 'octopus',  // What feature is this for?
    action: 'save'       // What action were we trying to do?
  });
  toast.error(message);
}
```

### Available Context Options

#### Features
- `'octopus'` - Octopus Energy integration
- `'tesla'` - Tesla integration
- `'notifications'` - Notification system
- `'location'` - Location/region services
- `'data'` - General data fetching
- `'auth'` - Authentication

#### Actions
- `'save'` - Saving credentials or data
- `'fetch'` - Fetching/loading data
- `'sync'` - Synchronizing data
- `'link'` - Linking/connecting an account
- `'disconnect'` - Unlinking/disconnecting
- `'calculate'` - Performing calculations

## Examples

### Octopus Energy - Save Credentials

```typescript
try {
  const { error } = await supabase.functions.invoke('octopus-energy', {
    body: { action: 'save-credentials', apiKey, accountNumber }
  });
  if (error) throw error;
} catch (error: unknown) {
  const message = parseEdgeFunctionError(error, {
    feature: 'octopus',
    action: 'save'
  });
  toast.error(message);
  // Shows: "Failed to save Octopus Energy credentials. Check they are correct and try again."
  // Or if 401: "Invalid Octopus Energy credentials. Please check your API key and account number."
}
```

### Tesla - Link Account

```typescript
try {
  await callTeslaFunction('exchange-code', { code, redirectUri });
  toast.success('Tesla account linked successfully!');
} catch (error) {
  const message = parseEdgeFunctionError(error, {
    feature: 'tesla',
    action: 'link'
  });
  toast.error(message);
  // Shows: "Failed to connect Tesla account. Please try again."
  // Or if 401: "Tesla authentication expired. Please reconnect your account."
}
```

### Generic Data Fetch

```typescript
try {
  const { data, error } = await supabase.functions.invoke('get-data', {
    body: { type: 'consumption' }
  });
  if (error) throw error;
} catch (error: unknown) {
  const message = parseEdgeFunctionError(error, {
    feature: 'data',
    action: 'fetch'
  });
  toast.error(message);
  // Shows: "Failed to load data. Please check your connection and try again."
}
```

## Error Message Mapping

| Status Code | Default Message | Octopus Context | Tesla Context |
|------------|----------------|-----------------|---------------|
| 401 | Authentication failed | Invalid Octopus Energy credentials | Tesla authentication expired |
| 403 | You don't have permission | Check your Octopus Energy API permissions | Access denied |
| 404 | Data could not be found | No meters found. Check account number | Data not found |
| 429 | Too many requests | Too many requests. Wait and try again | Too many requests |
| 500-503 | Service temporarily unavailable | Octopus Energy service unavailable | Tesla service unavailable |
| Timeout | Request timed out | Check your connection and try again | Check your connection |
| Network | Connection failed | Check your internet connection | Check your internet connection |
| Offline | You're offline | Check your connection | Check your connection |

## Best Practices

### ✅ Do

1. **Always provide context** when using `parseEdgeFunctionError`
   ```typescript
   const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'save' });
   ```

2. **Show success messages** to confirm actions worked
   ```typescript
   toast.success('Credentials saved successfully');
   ```

3. **Log errors** for debugging while showing friendly messages to users
   ```typescript
   logger.error('Failed to save credentials', { error });
   const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'save' });
   toast.error(message);
   ```

### ❌ Don't

1. **Don't show raw error messages**
   ```typescript
   // BAD
   toast.error(error.message);
   
   // GOOD
   const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'save' });
   toast.error(message);
   ```

2. **Don't use generic errors for user-facing messages**
   ```typescript
   // BAD
   toast.error('Something went wrong');
   
   // GOOD
   const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'save' });
   toast.error(message);
   ```

3. **Don't forget to handle edge function errors**
   ```typescript
   // BAD - User sees "Edge function returned a non-2xx status code"
   const { error } = await supabase.functions.invoke('action');
   if (error) toast.error(error.message);
   
   // GOOD - User sees contextual message
   const { error } = await supabase.functions.invoke('action');
   if (error) {
     const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'save' });
     toast.error(message);
   }
   ```

## Migration Guide

If you have existing error handling code, migrate it as follows:

### Before (Generic)
```typescript
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Failed to save credentials';
  toast.error(message);
}
```

### After (Context-Aware)
```typescript
catch (error: unknown) {
  const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'save' });
  toast.error(message);
}
```

## Testing Error Messages

To test your error handling:

1. **Offline Mode**: Disable network in DevTools to test offline messages
2. **Invalid Credentials**: Use fake API keys to test 401 errors  
3. **Server Errors**: Edge function errors will be caught and transformed automatically
4. **Rate Limiting**: Make rapid requests to test 429 handling

## Related Files

- `/src/lib/errorUtils.ts` - Error parsing and context utilities
- `/src/hooks/useOctopusEnergy.ts` - Example usage in Octopus integration
- `/src/hooks/useTeslaEnergy.ts` - Example usage in Tesla integration
- `/src/lib/logger.ts` - Error logging for debugging

## Summary

By using `parseEdgeFunctionError` with proper context, we ensure users always see helpful, actionable error messages instead of technical jargon. This improves the user experience and makes troubleshooting easier for everyone.
