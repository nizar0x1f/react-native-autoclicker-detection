package com.autoclickerdetection

/**
 * Auto-clicker / auto-tapper packages that are known to be distributed through
 * Google Play.
 *
 * IMPORTANT: this list must stay in sync with the `<queries>` element in
 * `android/src/main/AndroidManifest.xml`. On Android 11+ an app can only see
 * packages it declares there, so a package name that is missing from the
 * manifest is invisible at runtime and will never be reported.
 *
 * Extend both files together. Prefer adding only packages whose automation
 * behaviour you have confirmed.
 */
internal object KnownAutomationPackages {
  val PACKAGES: Array<String> = arrayOf(
    // Auto Clicker - Automatic tap (True Developers Studio)
    "com.truedevelopersstudio.automatictap.autoclicker",
    // Auto Clicker : Click Assistant
    "com.rise.automatic.autoclicker.clicker",
    // Auto Clicker: Auto Tapper
    "autoclicker.clicker.autoclickerapp.autoclickerforgames",
    // Auto Clicker Lite
    "uit.quocnguyen.autoclickerlite",
    // Tapping Auto Clicker
    "com.autoclicker.clicker",
    // Auto Clicker - Auto Tapper
    "com.autoclicker.tapping.autoclick.clicker.clickerforgame",
  )
}
