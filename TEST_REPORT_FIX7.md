# FIX7 Test Report

Date: 2026-07-28

## Result

- JavaScript syntax checks passed for cash bridge, receipt bridge, coin manager, payment, print, and service worker.
- FIX7 receipt and automatic-change regression: 27 checks passed.
- Existing cash integration regression: 32 assertions passed.
- Full web overlay regression: 19 test files passed.
- Existing LINE Pay, role permission, ticket rules, Firebase-facing data logic, PWA, service-worker, and coin-manager behavior remained intact.

## Verified transaction guards

- Cash acceptance does not start until the receipt printer health check succeeds.
- `CHANGE_PENDING` and `CHANGE_DISPENSING` remain non-printing states.
- A receipt request uses the durable print authorization as its idempotent job id.
- NT$300 accepted for an NT$250 order produces `paidNtd=300` and `changeNtd=50`.
- The ticket-issued acknowledgement is emitted only after the physical receipt is confirmed printed.
- Failed or uncertain printing enters operator recovery and is not automatically retried.
- The PWA cache includes the receipt CSS and JavaScript and uses a new FIX7 cache name.

## Scope

No Android Controller source was changed. Controller 110 remains the installed hardware
controller; this package repairs the web files that were overwritten by the prior
`WEB_UPDATE_ONLY` merge.
