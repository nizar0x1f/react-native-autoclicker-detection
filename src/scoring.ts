import { DEFAULT_ALLOWLIST } from './lists';
import type {
  NativeAccessibilityService,
  NativeEnvironment,
} from './NativeAutoclickerDetection';
import type {
  AccessibilityService,
  AutoclickerReport,
  ReportOptions,
  RiskLevel,
} from './types';

/** Raw facts collected from the device, before any scoring. */
export type AutoclickerFacts = {
  enabledAccessibilityServices: NativeAccessibilityService[];
  installedAutomationPackages: string[];
  environment: NativeEnvironment;
};

/**
 * Weights are intentionally coarse: this is a risk signal, not a verdict.
 * An enabled gesture-capable service is on its own enough to reach "high",
 * because that is exactly the capability an auto-clicker needs.
 */
const WEIGHTS = {
  gestureCapableService: 70,
  eachAdditionalGestureCapableService: 10,
  maxAdditionalGestureCapableService: 20,
  installedAutomationPackage: 45,
  rooted: 15,
  emulator: 10,
  adbEnabled: 5,
} as const;

const THRESHOLDS: ReadonlyArray<[RiskLevel, number]> = [
  ['high', 70],
  ['medium', 40],
  ['low', 15],
];

export function riskLevelForScore(score: number): RiskLevel {
  for (const [level, minimum] of THRESHOLDS) {
    if (score >= minimum) {
      return level;
    }
  }
  return 'none';
}

/**
 * Turns device facts into a scored report. Pure function so it can be unit
 * tested without an Android device.
 */
export function buildReport(
  facts: AutoclickerFacts,
  options: ReportOptions = {}
): AutoclickerReport {
  const allowlist = new Set(options.allowlist ?? DEFAULT_ALLOWLIST);
  const reasons: string[] = [];
  let score = 0;

  const enabledAccessibilityServices: AccessibilityService[] =
    facts.enabledAccessibilityServices.map((service) => ({
      ...service,
      allowed: allowlist.has(service.packageName),
    }));

  const gestureCapablePackages = [
    ...new Set(
      enabledAccessibilityServices
        .filter((service) => service.canPerformGestures && !service.allowed)
        .map((service) => service.packageName)
    ),
  ];

  if (gestureCapablePackages.length > 0) {
    const extra = Math.min(
      (gestureCapablePackages.length - 1) *
        WEIGHTS.eachAdditionalGestureCapableService,
      WEIGHTS.maxAdditionalGestureCapableService
    );
    score += WEIGHTS.gestureCapableService + extra;
    for (const packageName of gestureCapablePackages) {
      const label = enabledAccessibilityServices.find(
        (service) => service.packageName === packageName
      )?.label;
      reasons.push(
        `Accessibility service in "${packageName}"${label ? ` (${label})` : ''} can inject gestures`
      );
    }
  }

  const installedAutomationPackages = [
    ...new Set(facts.installedAutomationPackages),
  ];
  if (installedAutomationPackages.length > 0) {
    score += WEIGHTS.installedAutomationPackage;
    for (const packageName of installedAutomationPackages) {
      reasons.push(`Known automation app installed: "${packageName}"`);
    }
  }

  if (facts.environment.rooted) {
    score += WEIGHTS.rooted;
    reasons.push(
      'Device appears to be rooted, which allows shell-level input injection'
    );
  }
  if (facts.environment.emulator) {
    score += WEIGHTS.emulator;
    reasons.push(
      'App is running on an emulator, where input is usually scripted'
    );
  }
  if (facts.environment.adbEnabled) {
    score += WEIGHTS.adbEnabled;
    reasons.push(
      'ADB debugging is enabled, which allows "adb shell input tap"'
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    riskLevel: riskLevelForScore(score),
    score,
    gestureCapablePackages,
    enabledAccessibilityServices,
    installedAutomationPackages,
    environment: facts.environment,
    reasons,
  };
}
