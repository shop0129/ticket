# FIX16 Home First + No Freeze

- Home is now active in the initial HTML paint.
- Startup recovery waits for the Kiosk pairing key before querying Controller 113.
- Transient Controller startup failures retry automatically.
- The Kiosk 116 native protection screen remains visible until Home or a real payment is confirmed.
- A stale ticket page is never exposed as a successful fallback.
- Existing cash, LINE Pay, change, receipt, and print-authorization protections remain enabled.
- PWA cache: `7833-fix16-home-first-no-freeze-20260729-1`.
