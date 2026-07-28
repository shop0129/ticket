# V7.8.3.3 FIX7

- Restored the physical receipt bridge removed by the Controller 110 web-only merge.
- Added printer readiness checks before cash acceptance.
- Delayed ticket-issued acknowledgement until the physical receipt is confirmed printed.
- Preserved paid cash denomination totals and automatic change amount in the order and receipt.
- Added explicit UI states for pending and dispensing change.
- Added receipt recovery UI for failed or uncertain print results.
- Bumped the PWA cache and enabled immediate service-worker takeover.
