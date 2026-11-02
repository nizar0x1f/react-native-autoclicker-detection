import type {
  NativeAccessibilityService,
  NativeEnvironment,
} from './NativeAutoclickerDetection';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export type AccessibilityService = NativeAccessibilityService & {
  /** True when the package is in the allowlist used for this report. */
  allowed: boolean;
};

export type AutomationEnvironment = NativeEnvironment;

export type AutoclickerReport = {
  riskLevel: RiskLevel;
  /** 0-100. Weights are documented in `scoring.ts`. */
  score: number;
  /**
   * Enabled accessibility services that can inject gestures and are not in the
   * allowlist. This is the strongest signal: almost every auto-clicker needs it.
   */
  gestureCapablePackages: string[];
  enabledAccessibilityServices: AccessibilityService[];
  /** Known automation packages that are installed on the device. */
  installedAutomationPackages: string[];
  environment: AutomationEnvironment;
  /** Human readable explanation of every signal that contributed to `score`. */
  reasons: string[];
};

export type ReportOptions = {
  /**
   * Packages that are expected to hold an accessibility service on this device
   * (TalkBack, Voice Access, corporate MDM agents, ...). Defaults to
   * {@link DEFAULT_ALLOWLIST}.
   */
  allowlist?: string[];
};
