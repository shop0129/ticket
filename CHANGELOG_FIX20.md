# FIX20 Native Home Gate

- Android Kiosk 120 displays Home in a native layer using the production Home assets.
- WebView and ticket-card images warm up behind Home.
- Ticket selection is revealed only after a new native DOWN＋UP gesture and catalog readiness.
- Web Home, timeout Home, ticket Back and Android Back all restore the native Home layer.
- Service Worker reloads restart the full Home handshake.
- A recovered transaction with accepted cash explicitly dismisses the native Home
  and reveals the protected payment overlay so the transaction can be completed.
- FIX19 cash-recovery and PWA-cleanup safety remain unchanged.
