# Android Bluetooth Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a native Android companion bridge for direct, watermark-free ESC/POS printing.

**Architecture:** Add a minimal Kotlin Android app under `android-bridge/` with a WebView JavaScript interface and Bluetooth Classic SPP output. Update the web receipt flow to prefer the native bridge when embedded, while retaining existing Browser print and RawBT fallbacks.

**Tech Stack:** Kotlin, Android WebView, Android Bluetooth Classic RFCOMM, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-12-android-bluetooth-bridge-design.md`

## Global Constraints

- Do not change receipt ESC/POS bytes or transaction data.
- Do not require RawBT for the native bridge path.
- Pair VOZY/PrinterX in Android settings before printing.
- Physical printing remains required for final device validation.

## Tasks

### Task 1: Native Android bridge

- [ ] Create the Android project and `MainActivity.kt` WebView bridge.
- [ ] Declare Bluetooth Classic and Android 12+ runtime permissions.
- [ ] List paired printers, prefer VOZY/PrinterX names, and write ESC/POS over SPP.

### Task 2: Web integration

- [ ] Detect `AndroidBluetoothBridge` and expose Direct Bluetooth bridge as the preferred Android print method.
- [ ] Base64-encode the existing ESC/POS receipt and pass it to the native interface.
- [ ] Keep Browser print and RawBT fallback paths.

### Task 3: Verification

- [ ] Run bridge-focused tests, full test suite, typecheck, and client build.
- [ ] Build the APK when Android SDK/Gradle is available; otherwise report the exact environment blocker.
