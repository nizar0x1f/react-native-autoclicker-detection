# react-native-autoclicker-detection

[![npm version](https://img.shields.io/npm/v/react-native-autoclicker-detection.svg)](https://www.npmjs.com/package/react-native-autoclicker-detection)
[![CI](https://github.com/nizar0x1f/react-native-autoclicker-detection/actions/workflows/ci.yml/badge.svg)](https://github.com/nizar0x1f/react-native-autoclicker-detection/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/react-native-autoclicker-detection.svg)](./LICENSE)

Detect Android auto-clicker and automation apps from React Native.

Android auto-clickers work by enabling an **accessibility service** and
dispatching gestures through it. This package collects that signal, together
with known automation packages and device state, and turns it into a scored
risk report. Nothing is blocked or enforced; you decide what to do with the
result.

- No runtime permissions and no `QUERY_ALL_PACKAGES`
- Package visibility declared per package, keeping Play Store policy review straightforward
- Works with the New Architecture (TurboModule) and Expo development builds
- Safe no-op on iOS and in Expo Go

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [API](#api)
- [Risk levels and scoring](#risk-levels-and-scoring)
- [Allowlist](#allowlist)
- [What this can and cannot see](#what-this-can-and-cannot-see)
- [Platform support](#platform-support)
- [Errors](#errors)
- [Privacy](#privacy)
- [Security considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Requirements

| Requirement | Version |
| --- | --- |
| React Native | 0.76 or newer (New Architecture, the default since 0.76) |
| Android `minSdk` | 24 |
| Android `compileSdk` | 36 by default; follows the project-wide `compileSdkVersion` ext value when set |
| iOS | No native detection; the module resolves to empty facts |
| Expo | Development build or prebuild. Not supported in Expo Go |

The package is developed and tested against React Native 0.88 and Expo SDK
compatible with that release.

## Installation

```sh
npm install react-native-autoclicker-detection
```

or with Yarn:

```sh
yarn add react-native-autoclicker-detection
```

Autolinking handles the rest. No config plugin or manual native setup is
required.

### Expo

The package works in an Expo **development build** or after `npx expo prebuild`.
It declares no permissions and ships its own package-visibility manifest, so no
config plugin is needed.

It does **not** work in **Expo Go**, which cannot load custom native code. Use
`isAvailable()` to guard your logic:

```ts
import { getReport, isAvailable } from 'react-native-autoclicker-detection';

if (!isAvailable()) {
  return; // Expo Go or iOS: no detection signal is available
}

const report = await getReport();
```

## Quick start

```ts
import { getReport } from 'react-native-autoclicker-detection';

const report = await getReport();

report.riskLevel;                   // 'none' | 'low' | 'medium' | 'high'
report.score;                       // 0-100
report.gestureCapablePackages;      // enabled services that can inject gestures
report.installedAutomationPackages; // known auto-clicker apps that are installed
report.environment;                 // { adbEnabled, rooted, emulator }
report.reasons;                     // human readable explanation of the score
```

An enabled accessibility service is also how screen readers work, so prefer
logging, step-up authentication or degraded features over hard blocking:

```ts
const report = await getReport();

if (report.riskLevel === 'high' || report.riskLevel === 'medium') {
  await analytics.track('automation_risk', report);
}
```

## API

### `isAvailable(): boolean`

Whether detection is available in this build and on this platform. Returns
`false` in Expo Go and on every non-Android platform, including iOS.

Every other function remains callable when this is `false` and resolves to empty
facts, but a `riskLevel` of `none` then means "no signal", not "clean device".
Guard with this function instead of trusting the risk level.

### `getReport(options?: ReportOptions): Promise<AutoclickerReport>`

Collects every signal in parallel and scores it. See
[Risk levels and scoring](#risk-levels-and-scoring).

### `getEnabledAccessibilityServices(options?: ReportOptions): Promise<AccessibilityService[]>`

Accessibility services that are currently enabled, each annotated with whether
its package is in the allowlist used for this report.

```ts
const services = await getEnabledAccessibilityServices();
// [{ componentName, packageName, label, canPerformGestures, allowed }]
```

### `getInstalledAutomationPackages(): Promise<string[]>`

Known automation and auto-clicker packages that are installed on the device.

On Android 11 and newer, only packages declared in the library manifest's
`<queries>` element are observable. See
[What this can and cannot see](#what-this-can-and-cannot-see).

### `getEnvironment(): Promise<AutomationEnvironment>`

Root, emulator and ADB state of the device.

```ts
const environment = await getEnvironment();
// { adbEnabled: boolean, rooted: boolean, emulator: boolean }
```

### `buildReport(facts, options?): AutoclickerReport`

Pure scoring function. Use it when you already have the raw facts, for example
from your own native bridge or from a test fixture. The scoring weights are
documented in [Risk levels and scoring](#risk-levels-and-scoring) and in the
source.

### `riskLevelForScore(score: number): RiskLevel`

Maps a numeric score to `'none' | 'low' | 'medium' | 'high'`.

### `DEFAULT_ALLOWLIST: readonly string[]`

Accessibility packages that are expected to be present on a normal device
(TalkBack, Switch Access, Voice Access and the Samsung accessibility suite).
Spread it when you need to extend rather than replace it.

### Types

```ts
type RiskLevel = 'none' | 'low' | 'medium' | 'high';

type AccessibilityService = {
  /** Flattened component name, e.g. `com.example.clicker/.ClickService`. */
  componentName: string;
  /** Owning application package. */
  packageName: string;
  /** Human readable app label, or an empty string when it cannot be resolved. */
  label: string;
  /** True when the service requests `CAPABILITY_CAN_PERFORM_GESTURES`. */
  canPerformGestures: boolean;
  /** True when the package is in the allowlist used for this report. */
  allowed: boolean;
};

type AutomationEnvironment = {
  /** USB/ADB debugging is enabled, which allows `adb shell input tap`. */
  adbEnabled: boolean;
  /** A `su` binary or a root manager app was found. */
  rooted: boolean;
  /** The build looks like an emulator (BlueStacks, LDPlayer, AVD, ...). */
  emulator: boolean;
};

type AutoclickerReport = {
  riskLevel: RiskLevel;
  /** 0-100. */
  score: number;
  /** Enabled, non-allowlisted services that can inject gestures. */
  gestureCapablePackages: string[];
  enabledAccessibilityServices: AccessibilityService[];
  installedAutomationPackages: string[];
  environment: AutomationEnvironment;
  /** Human readable explanation of every signal that contributed to `score`. */
  reasons: string[];
};

type ReportOptions = {
  /** Replaces `DEFAULT_ALLOWLIST` for this call. */
  allowlist?: readonly string[];
};
```

## Risk levels and scoring

| Signal | Weight |
| --- | --- |
| Enabled accessibility service that can inject gestures and is not allowlisted | 70 (+10 per additional package, capped at +20) |
| Known automation package installed | 45 |
| Rooted | 15 |
| Emulator | 10 |
| ADB enabled | 5 |

Scores are clamped to 0-100: `high` is 70 or more, `medium` 40 or more, `low` 15
or more, everything else is `none`.

An enabled gesture-capable service is enough on its own to reach `high`, because
that is exactly the capability an auto-clicker needs. Packages are counted once,
even if they expose several accessibility services.

The scoring is pure TypeScript and runs without a device. If your product needs
different weights, use `buildReport()` on facts you collected yourself, or score
the raw signals returned by the individual functions.

## Allowlist

System accessibility tools that legitimately dispatch gestures are allowlisted
by default, so screen reader users are not treated as attackers. Pass your own
list to replace it, for example when your app ships its own accessibility
service or runs under an MDM agent that has one:

```ts
import { DEFAULT_ALLOWLIST, getReport } from 'react-native-autoclicker-detection';

const report = await getReport({
  allowlist: [...DEFAULT_ALLOWLIST, 'com.your.mdm.agent'],
});
```

Only services that also declare `CAPABILITY_CAN_PERFORM_GESTURES` are ever
flagged, so the list only needs to cover tools that can dispatch gestures.

## What this can and cannot see

**It sees** every *enabled* accessibility service, via `AccessibilityManager`,
cross-checked against `Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES`, and
whether that service declares `CAPABILITY_CAN_PERFORM_GESTURES`.

**It cannot see** installed apps in general. Since Android 11, package
visibility is filtered, and Google Play only permits `QUERY_ALL_PACKAGES` for
device search, antivirus, file managers and browsers. Instead, this library
declares the packages it cares about in its own manifest:

```xml
<queries>
  <package android:name="com.example.clicker" />
</queries>
```

The list lives in both
`android/src/main/java/com/autoclickerdetection/KnownAutomationPackages.kt`
**and** `android/src/main/AndroidManifest.xml`. Both must be updated together: a
package missing from the manifest is invisible at runtime and will never be
reported. The list is fixed at build time and cannot be updated remotely.

**It does not detect** a clicker in the act. Shell-level injection
(`adb shell input tap`, `sendevent`), emulator macros and in-process
`MotionEvent` injection are only observable from inside your own UI, which is
out of scope for this package.

## Platform support

| Platform | `isAvailable()` | Behaviour |
| --- | --- | --- |
| Android, app or development build | `true` | Full detection |
| Android, Expo Go | `false` | Empty facts |
| iOS | `false` | Empty facts; the native module is a no-op |
| Web and other platforms | `false` | Empty facts |

## Errors

Native query failures reject the promise with one of the following codes:

| Code | Function |
| --- | --- |
| `E_ACCESSIBILITY_QUERY_FAILED` | `getEnabledAccessibilityServices()` |
| `E_PACKAGE_QUERY_FAILED` | `getInstalledAutomationPackages()` |
| `E_ENVIRONMENT_QUERY_FAILED` | `getEnvironment()` |

`getReport()` rejects if any of its three queries rejects.

## Privacy

The library performs no network requests and collects no data. All signals are
read on-device and returned to your JavaScript code, which decides whether to
send them anywhere.

## Security considerations

This is a heuristic risk signal, not a security boundary. It can produce false
positives (screen readers, MDM agents, rooted power users) and false negatives
(in-process injection, shell-level injection, obfuscated automation apps). Do
not use it as the only factor for authentication, payments or account
authorisation; combine it with server-side risk controls.

## Troubleshooting

**`getReport()` returns `none` in Expo Go or on iOS**

Expected. `isAvailable()` returns `false` there because no native detection
module is available. Build a development build to test on Android.

**An installed auto-clicker is not reported**

Check that its package name is declared in both
`KnownAutomationPackages.kt` and `AndroidManifest.xml`. Package visibility is
filtered on Android 11 and newer, so a package that is missing from the manifest
cannot be seen at runtime.

**A legitimate accessibility tool is flagged**

Add it to `DEFAULT_ALLOWLIST` or pass a custom `allowlist` to `getReport()`. Only
services that can inject gestures are flagged.

**The score changed after an app update**

The scoring weights are part of the package version. Check the
[changelog](./CHANGELOG.md) when upgrading.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community guidelines.

Security issues should be reported according to [SECURITY.md](./SECURITY.md).

## License

MIT (c) [Nizar Bamida](https://github.com/nizar0x1f)
