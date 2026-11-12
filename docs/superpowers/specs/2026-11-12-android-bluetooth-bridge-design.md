# Android Bluetooth Bridge

## Intent

Print Scrapboard ESC/POS receipts directly to paired VOZY and PrinterX
Bluetooth Classic printers from a Poco M1 without routing through RawBT.

## Design

The `android-bridge` companion app loads the deployed Scrapboard URL in a
WebView and exposes `AndroidBluetoothBridge.printEscPos(base64)`. The web app
uses that bridge when present and keeps Browser print/RawBT fallback options
when opened outside the companion app. The native app lists paired printers,
prefers names containing VOZY or PrinterX, connects over the standard SPP UUID,
writes the decoded ESC/POS bytes, and closes the socket.

## Constraints

- The user must pair the printer in Android Bluetooth settings first.
- Android 12+ Bluetooth permissions are requested at runtime.
- A physical Poco M1 + VOZY/PrinterX test is required to verify the printer's
  SPP behavior; the repository has no Android SDK or physical device access.
- The bridge sends receipt bytes only; it does not add a watermark.
