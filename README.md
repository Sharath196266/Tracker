# Tracker

Tracker is a personal finance app built with Expo and React Native. It records spending, balances, source-linked transfers, credit-card activity, loans, investments, and spending analytics in one place.

## About

Created and maintained by Sharath (`Sharath196266`). The app is designed for fast personal tracking with persistent local data and source-aware financial logic.

## Features

- Expense ledger with date, time, source, platform, payee, place, category, and notes.
- Savings accounts, credit cards, loans, and investments as balance sources.
- Source-linked payments update both sides of a transfer or repayment.
- Custom platforms and categories with source linking.
- Balance summaries and spending charts.
- Local persistence using AsyncStorage with legacy-data migration and guarded parsing.

## Requirements

- Node.js 20 or newer
- npm
- Expo SDK 57
- Android Studio for local Android builds, or an Expo/EAS build account for cloud builds

## Install and run

```bash
npm install
npx expo start
```

Use Expo Go or an Android/iOS simulator from the Expo developer menu.

## Build an Android APK locally

Install Android Studio, an Android SDK, and configure `ANDROID_HOME`, then run:

```bash
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The APK will be at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

For a development APK:

```bash
cd android
./gradlew assembleDebug
```

## Build with EAS

Install and log in to EAS:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

The completed build page provides the APK download link. The project profiles are defined in `eas.json`.

## Validate a release bundle

```bash
npx expo export --platform ios
```

## Data and recovery

App data is stored locally on the device in AsyncStorage. The app restores expenses, balances, sources, custom options, the user name, and Balance transactions on startup. Storage parsing is guarded so malformed optional data does not crash the app. Uninstalling the app or clearing app storage removes local data; export important records before doing that.

## Repository

[https://github.com/Sharath196266/Tracker](https://github.com/Sharath196266/Tracker)
