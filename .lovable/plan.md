# Octopus sync investigation: findings (read-only, nothing changed)

## 1. octopus-energy logs
- Function log tool: "No logs found for edge function 'octopus-energy'."
- Log store holds only ~3 minutes of call history (oldest 07:13:02 UTC, newest 07:15:44 UTC today). Nothing from 06:00 or 06:30, and nothing earlier in the 7 days.
- So none of the requested lines can be quoted ("Found N users with active meters", "Synced N readings", "[FOOTPRINT] Skipped", etc.): they are not available.
- The scheduler's own response record only goes back to about 06:00 UTC today. Rows at the cron times:
  - 06:00:00 UTC, id 1414: no response. `Timeout of 5000 ms reached. Total time: 5000.246000 ms (DNS time: 5.824000 ms, TCP/SSL handshake time: 55.118000 ms, HTTP Request/Response time: 4939.171000 ms)`
  - 06:30:00 UTC, id 1417: HTTP 200, `{"success":true,"users_synced":1,"errors":0}`
  - The other 06:00/06:30 rows are check-carbon-intensity and daily-forecast responses.
- Unconfirmed: these rows don't record which job sent them. Most likely 1414 is the 06:00 sync-all-users call and 1417 is the 06:30 calculate-all-footprints call, but that is inferred. The 5s timeout is on the scheduler side. The function may still have finished after it, but no function logs exist to say whether it did.
- No user IDs or MPANs appeared in anything retrieved.

## 2. OCTOPUS_ secrets (names only)
- OCTOPUS_ACCOUNT_NUMBER: set
- OCTOPUS_API_KEY: set
- OCTOPUS_CREDENTIALS_KEY: set

## 3. Last deploy of octopus-energy
- No deploy timestamp is visible from here. It was not deployed in this thread's recent turns.

## Optional next step (needs your approval, read-only)
- After tomorrow's 06:00 and 06:30 UTC runs, pull the function logs straight away, before they expire, and quote the lines you asked for.
