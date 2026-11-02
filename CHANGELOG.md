# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-02

### Added

- `getReport()` returns a scored `AutoclickerReport` with a risk level, the
  matching reasons, and the raw signals.
- `getEnabledAccessibilityServices()` lists enabled accessibility services and
  whether they can inject gestures.
- `getInstalledAutomationPackages()` lists installed auto-clicker packages that
  are declared in the library manifest.
- `getEnvironment()` reports root, emulator and ADB state.
- `isAvailable()` distinguishes a supported Android build from iOS, unsupported
  platforms and Expo Go.
- `buildReport()` and `riskLevelForScore()` expose the pure scoring logic.
- `DEFAULT_ALLOWLIST` ships accessibility tools that legitimately dispatch
  gestures (TalkBack, Switch Access, Voice Access, Samsung accessibility).
- Android TurboModule that merges `AccessibilityManager` with
  `Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES`.
- Package visibility through per-package `<queries>` declarations, with no
  runtime permissions and no `QUERY_ALL_PACKAGES`.
- iOS implementation that resolves to empty facts, keeping the JS API safe
  without platform checks.
- Unit test suite for the scoring, ESLint and TypeScript checks, and CI for
  lint, typecheck, tests, library build, and example builds.

[Unreleased]: https://github.com/nizar0x1f/react-native-autoclicker-detection/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nizar0x1f/react-native-autoclicker-detection/releases/tag/v0.1.0
