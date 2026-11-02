import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * An accessibility service that is currently enabled on the device.
 *
 * Auto-clickers on Android work by enabling an accessibility service and
 * dispatching gestures through it, so this is the primary detection signal.
 */
export type NativeAccessibilityService = {
  /** Flattened component name, e.g. `com.example.clicker/.ClickService`. */
  componentName: string;
  /** Owning application package, e.g. `com.example.clicker`. */
  packageName: string;
  /** Human readable app label, or an empty string when it cannot be resolved. */
  label: string;
  /** True when the service requests `CAPABILITY_CAN_PERFORM_GESTURES`. */
  canPerformGestures: boolean;
};

export type NativeEnvironment = {
  /** USB/ADB debugging is enabled, which allows `adb shell input tap`. */
  adbEnabled: boolean;
  /** A `su` binary or a root manager app was found. */
  rooted: boolean;
  /** The build looks like an emulator (BlueStacks, LDPlayer, AVD, ...). */
  emulator: boolean;
};

export interface Spec extends TurboModule {
  /**
   * Enabled accessibility services, merged from `AccessibilityManager` and
   * `Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES`.
   */
  getEnabledAccessibilityServices(): Promise<Array<NativeAccessibilityService>>;

  /**
   * Known automation packages that are installed. Only packages declared in
   * the library manifest's `<queries>` element can be observed on Android 11+.
   */
  getInstalledAutomationPackages(): Promise<Array<string>>;

  getEnvironment(): Promise<NativeEnvironment>;
}

// `get` instead of `getEnforcing`: on Expo Go and on platforms where the native
// module is not linked, this resolves to `null` instead of throwing at import
// time, so bundle evaluation stays safe. `isAvailable()` exposes the result.
export default TurboModuleRegistry.get<Spec>('AutoclickerDetection');
