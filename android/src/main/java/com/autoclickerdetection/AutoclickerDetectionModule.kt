package com.autoclickerdetection

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import java.io.File

@Suppress("DEPRECATION")
class AutoclickerDetectionModule(reactContext: ReactApplicationContext) :
  NativeAutoclickerDetectionSpec(reactContext) {

  override fun getEnabledAccessibilityServices(promise: Promise) {
    try {
      val context = reactApplicationContext
      val capabilities = LinkedHashMap<String, Boolean>()

      // The accessibility framework is the authoritative source for enabled
      // services and it also tells us whether the service can inject gestures,
      // which is the capability an auto-clicker relies on.
      val manager =
        context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
      manager
        ?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
        ?.forEach { info ->
          val id = info.id ?: return@forEach
          capabilities[canonicalComponent(id)] =
            info.capabilities and AccessibilityServiceInfo.CAPABILITY_CAN_PERFORM_GESTURES != 0
        }

      // Some OEM builds filter the framework list. The raw setting is not
      // filtered by package visibility, so use it as a safety net. Services that
      // are only known from the setting get `canPerformGestures = false`, which
      // means they are reported but never treated as a suspicious signal.
      enabledServicesSetting(context)
        .split(':')
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .forEach { id -> capabilities.putIfAbsent(canonicalComponent(id), false) }

      val result: WritableArray = Arguments.createArray()
      capabilities.forEach { (id, canPerformGestures) ->
        val packageName = ComponentName.unflattenFromString(id)?.packageName
          ?: id.substringBefore('/')
        result.pushMap(
          Arguments.createMap().apply {
            putString("componentName", id)
            putString("packageName", packageName)
            putString("label", appLabel(context, packageName))
            putBoolean("canPerformGestures", canPerformGestures)
          }
        )
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject(ERROR_ACCESSIBILITY, error.message, error)
    }
  }

  override fun getInstalledAutomationPackages(promise: Promise) {
    try {
      val packageManager = reactApplicationContext.packageManager
      val result: WritableArray = Arguments.createArray()

      // Only packages declared in the manifest's <queries> element are visible
      // here, so this loop is deliberately driven by a known package list
      // instead of getInstalledPackages().
      KnownAutomationPackages.PACKAGES.forEach { packageName ->
        if (isInstalled(packageManager, packageName)) {
          result.pushString(packageName)
        }
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject(ERROR_PACKAGES, error.message, error)
    }
  }

  override fun getEnvironment(promise: Promise) {
    try {
      val context = reactApplicationContext
      val adbEnabled =
        Settings.Global.getInt(context.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1

      promise.resolve(
        Arguments.createMap().apply {
          putBoolean("adbEnabled", adbEnabled)
          putBoolean("rooted", isRooted())
          putBoolean("emulator", isEmulator())
        }
      )
    } catch (error: Exception) {
      promise.reject(ERROR_ENVIRONMENT, error.message, error)
    }
  }

  /**
   * `AccessibilityManager` reports components in short form
   * (`pkg/.Service`), while `Settings.Secure` may store the fully qualified
   * class name. Normalising both keeps exactly one entry per service.
   */
  private fun canonicalComponent(rawId: String): String =
    ComponentName.unflattenFromString(rawId)?.flattenToString() ?: rawId

  private fun enabledServicesSetting(context: Context): String =
    try {
      Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
      ) ?: ""
    } catch (error: Exception) {
      ""
    }

  private fun appLabel(context: Context, packageName: String): String =
    try {
      val packageManager = context.packageManager
      packageManager.getApplicationLabel(
        packageManager.getApplicationInfo(packageName, 0)
      ).toString()
    } catch (error: Exception) {
      ""
    }

  private fun isInstalled(packageManager: PackageManager, packageName: String): Boolean =
    try {
      packageManager.getPackageInfo(packageName, 0)
      true
    } catch (error: PackageManager.NameNotFoundException) {
      false
    } catch (error: SecurityException) {
      false
    }

  private fun isRooted(): Boolean {
    if (!Build.TAGS.isNullOrEmpty() && Build.TAGS.contains("test-keys")) {
      return true
    }

    val markers = arrayOf(
      "/system/bin/su",
      "/system/xbin/su",
      "/sbin/su",
      "/system/sd/xbin/su",
      "/system/bin/failsafe/su",
      "/data/local/su",
      "/data/local/bin/su",
      "/data/local/xbin/su",
      "/system/xbin/daemonsu",
      "/su/bin/su",
      "/system/app/Superuser.apk",
      "/system/app/SuperSU.apk",
    )

    return markers.any { path -> File(path).exists() }
  }

  private fun isEmulator(): Boolean {
    val fingerprint = Build.FINGERPRINT ?: ""
    val model = Build.MODEL ?: ""
    val product = Build.PRODUCT ?: ""
    val hardware = Build.HARDWARE ?: ""

    return fingerprint.startsWith("generic") ||
      fingerprint.startsWith("unknown") ||
      model.contains("google_sdk") ||
      model.contains("Emulator") ||
      model.contains("Android SDK built for") ||
      hardware.contains("goldfish") ||
      hardware.contains("ranchu") ||
      product.contains("sdk_gphone") ||
      product.contains("vbox86p") ||
      product.contains("emulator")
  }

  companion object {
    const val NAME = NativeAutoclickerDetectionSpec.NAME

    private const val ERROR_ACCESSIBILITY = "E_ACCESSIBILITY_QUERY_FAILED"
    private const val ERROR_PACKAGES = "E_PACKAGE_QUERY_FAILED"
    private const val ERROR_ENVIRONMENT = "E_ENVIRONMENT_QUERY_FAILED"
  }
}
