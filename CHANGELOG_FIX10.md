# V7.8.3.3 FIX10

- Restored the kiosk ticket-header anti-shrink rule that was absent from the latest FIX9 web build.
- Added a minimum 20px top safe area for Android WebView and PWA fullscreen layouts.
- Kept ticket and detail headers sticky and protected both back buttons.
- Bumped the stylesheet query and Service Worker cache version so the device loads the new CSS.
- Added an immediately visible cash amount overlay and a zero-paid-only cancel-and-return action.
- Added Controller 113 integration for durable payment-cancel requests; cancellation remains blocked after any cash is accepted.
- Preserved FIX9 payment-page cleanup, low-price bill acceptance, automatic change, and receipt behavior.
