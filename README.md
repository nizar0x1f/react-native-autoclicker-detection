# react-native-autoclicker-detection

Detect Android auto-clicker and automation apps from React Native.

Android auto-clickers work by enabling an **accessibility service** and dispatching gestures through it. This package collects the signals that exposes — plus known automation packages and the device environment — and scores them. Nothing is enforced: you decide what to do with the result.

- No permissions requested, no `QUERY_ALL_PACKAGES`
- Play Store policy compliant by design
- Works with the New Architecture (TurboModule) and with Expo development builds
- Safe no-op on iOS and in Expo Go

## Installation

```sh
npm install react-native-autoclicker-detection
```

Autolinking handles the rest.

### Expo

Works in an Expo **development build** or after `npx expo prebuild` — no config plugin required, because the library declares no permissions and ships its own package-visibility manifest.

It does **not** work in **Expo Go**, which cannot load custom native code. There the module is not linked and every method resolves to empty facts, so guard your logic:

```ts
import { isAvailable, getReport } from 'react-native-autoclicker-detection';

if (!isAvailable()) {
  return; // Expo Go or unsupported platform: no signal available
}

const report = await getReport();
```

Android `minSdk` is 24, which matches the Expo SDK minimum.

## Usage

```ts
import { getReport } from 'react-native-autoclicker-detection';

const report = await getReport();

report.riskLevel;                   // 'none' | 'low' | 'medium' | 'high'
report.score;                       // 0-100
report.gestureCapablePackages;      // enabled accessibility services that can inject gestures
report.installedAutomationPackages; // known auto-clicker apps that are installed
report.environment;                 // { adbEnabled, rooted, emulator }
report.reasons;                     // human readable explanation of the score
```

Because an enabled accessibility service is also how screen readers work, prefer logging, step-up authentication or degraded features over hard blocking:

```ts
const report = await getReport();

if (report.riskLevel === 'high' || report.riskLevel === 'medium') {
  await analytics.track('automation_risk', report);
}
```

### Individual signals

```ts
import {
  getEnabledAccessibilityServices,
  getInstalledAutomationPackages,
  getEnvironment,
} from 'react-native-autoclicker-detection';

const services = await getEnabledAccessibilityServices();
// [{ packageName, componentName, label, canPerformGestures, allowed }]

const installed = await getInstalledAutomationPackages();
// ['com.truedevelopersstudio.automatictap.autoclicker']

const environment = await getEnvironment();
// { adbEnabled, rooted, emulator }
```

### Allowlist

System accessibility tools that legitimately dispatch gestures are allowlisted by default (see `DEFAULT_ALLOWLIST`). Pass your own list to replace it — for example when your app ships its own accessibility service or runs under an MDM agent that has one:

```ts
const report = await getReport({
  allowlist: [...DEFAULT_ALLOWLIST, 'com.your.mdm.agent'],
});
```

### Scoring

| Signal | Weight |
| --- | --- |
| Enabled accessibility service that can inject gestures and is not allowlisted | 70 (+10 per extra, max 90) |
| Known automation package installed | 45 |
| Rooted | 15 |
| Emulator | 10 |
| ADB enabled | 5 |

Scores are clamped to 0-100; `high` ≥ 70, `medium` ≥ 40, `low` ≥ 15. `buildReport()` and `riskLevelForScore()` are exported if you want different weights — the scoring is pure TypeScript and runs without a device.

## What this can and cannot see

**It sees** every *enabled* accessibility service (via `AccessibilityManager`, cross-checked against `Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES`) and whether that service declares `CAPABILITY_CAN_PERFORM_GESTURES`.

**It cannot see** installed apps in general. Since Android 11, package visibility is filtered and Google Play only permits `QUERY_ALL_PACKAGES` for device search, antivirus, file managers and browsers — it rejects apps that could use a narrower mechanism. Instead this library declares the packages it cares about in its own manifest:

```xml
<queries>
  <package android:name="com.example.clicker" />
</queries>
```

The list lives in `android/src/main/java/com/autoclickerdetection/KnownAutomationPackages.kt` **and** `android/src/main/AndroidManifest.xml`. Both must be updated together: a package missing from the manifest is invisible at runtime and will never be reported. This also means the list is fixed at build time and cannot be updated remotely.

**It does not detect** a clicker in the act. Shell-level injection (`adb shell input tap`, `sendevent`), emulator macros and in-process `MotionEvent` injection are only observable from inside your own UI, which is out of scope for this package.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT © [nizar bamida](https://github.com/nizar0x1f)
