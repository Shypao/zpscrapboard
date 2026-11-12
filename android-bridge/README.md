# Scrapboard Bluetooth Bridge

This Android companion app loads the Scrapboard web app and exposes a small
JavaScript bridge named `AndroidBluetoothBridge`. It sends the app's existing
ESC/POS bytes directly to a paired Bluetooth Classic/SPP printer, including
VOZY and PrinterX devices, without RawBT.

## Poco M1 setup

1. Pair the VOZY or PrinterX printer in Android Bluetooth settings.
2. Build and install the debug APK on the Poco M1.
3. Open the bridge app, sign in to Scrapboard, and choose **Bluetooth bridge**
   in the receipt print method.
4. Use **Test printer** first, then print a saved receipt.

The bridge does not discover or pair printers itself; it only lists already
paired devices and opens the standard SPP UUID. A physical printer test is
required because models can differ in baud/protocol behavior.
