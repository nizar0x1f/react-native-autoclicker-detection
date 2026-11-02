import { Platform } from 'react-native';

import { DEFAULT_ALLOWLIST } from './lists';
import NativeAutoclickerDetection from './NativeAutoclickerDetection';
import { buildReport } from './scoring';
import type {
  AccessibilityService,
  AutoclickerReport,
  AutomationEnvironment,
  ReportOptions,
} from './types';

export type { AutoclickerFacts } from './scoring';
export type {
  AccessibilityService,
  AutoclickerReport,
  AutomationEnvironment,
  ReportOptions,
  RiskLevel,
} from './types';
export { DEFAULT_ALLOWLIST } from './lists';
export { buildReport, riskLevelForScore } from './scoring';

const EMPTY_ENVIRONMENT: AutomationEnvironment = {
  adbEnabled: false,
  rooted: false,
  emulator: false,
};

/**
 * Whether detection is available in this build and on this platform.
 *
 * Returns `false` on iOS, on non-Android platforms, and in Expo Go, which cannot
 * load custom native code. Every other method stays callable and resolves to
 * empty facts in that case, so guard your logic with this instead of trusting a
 * `riskLevel` of `none`.
 */
export function isAvailable(): boolean {
  return Platform.OS === 'android' && NativeAutoclickerDetection != null;
}

/**
 * Accessibility services that are currently enabled, each annotated with
 * whether its package is in the allowlist. Resolves to an empty array on iOS and
 * when the native module is not linked.
 */
export async function getEnabledAccessibilityServices(
  options: ReportOptions = {}
): Promise<AccessibilityService[]> {
  const allowlist = new Set(options.allowlist ?? DEFAULT_ALLOWLIST);
  const services =
    (await NativeAutoclickerDetection?.getEnabledAccessibilityServices()) ?? [];

  return services.map((service) => ({
    ...service,
    allowed: allowlist.has(service.packageName),
  }));
}

/**
 * Known automation packages that are installed on the device.
 *
 * Only packages declared in the library manifest's `<queries>` element are
 * observable on Android 11+, because `QUERY_ALL_PACKAGES` is not permitted for
 * this use case by Google Play. Resolves to an empty array on iOS and when the
 * native module is not linked.
 */
export function getInstalledAutomationPackages(): Promise<string[]> {
  return (
    NativeAutoclickerDetection?.getInstalledAutomationPackages() ??
    Promise.resolve([])
  );
}

/**
 * Root, emulator and ADB state of the device. Resolves to all-false facts on
 * iOS and when the native module is not linked.
 */
export function getEnvironment(): Promise<AutomationEnvironment> {
  return (
    NativeAutoclickerDetection?.getEnvironment() ??
    // Copy so callers cannot mutate the shared fallback.
    Promise.resolve({ ...EMPTY_ENVIRONMENT })
  );
}

/**
 * Collects every signal in parallel and scores it.
 *
 * Nothing is blocked or enforced here: an enabled accessibility service is also
 * how screen readers work, so treat the result as a risk signal and decide what
 * to do (log, step-up authentication, degrade features) in your app.
 *
 * Rejects if one of the native queries fails; see the error codes documented in
 * the README.
 */
export async function getReport(
  options: ReportOptions = {}
): Promise<AutoclickerReport> {
  const [
    enabledAccessibilityServices,
    installedAutomationPackages,
    environment,
  ] = await Promise.all([
    getEnabledAccessibilityServices(options),
    getInstalledAutomationPackages(),
    getEnvironment(),
  ]);

  return buildReport(
    { enabledAccessibilityServices, installedAutomationPackages, environment },
    options
  );
}
