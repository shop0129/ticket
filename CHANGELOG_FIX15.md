# FIX15 Kiosk Home + Visible Print Progress

- Added a safe Home request shared by kiosk startup and the ticket-page Back button.
- A zero-cash stale transaction is reconciled with Controller 113 and canceled before Home is shown.
- Any transaction with accepted cash remains locked and visible for safe completion or reconciliation.
- Added a FIX15 routing API for Kiosk 115 to confirm that Home is actually active.
- Receipt progress now uses a CSS compositor animation plus JavaScript fallbacks.
- Receipt printing starts only after the first progress frame has been painted.
- Progress remains capped below 100% until the physical printer confirms completion.
- Bumped the PWA cache to `7833-fix15-kiosk-home-visible-print-20260729-1`.
