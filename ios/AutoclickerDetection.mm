#import "AutoclickerDetection.h"

@implementation AutoclickerDetection

// Detection is Android-only. Returning empty facts keeps the JS API usable on
// iOS (riskLevel "none") without consumers needing platform checks.

- (void)getEnabledAccessibilityServices:(RCTPromiseResolveBlock)resolve
                                 reject:(RCTPromiseRejectBlock)reject
{
  resolve(@[]);
}

- (void)getInstalledAutomationPackages:(RCTPromiseResolveBlock)resolve
                                reject:(RCTPromiseRejectBlock)reject
{
  resolve(@[]);
}

- (void)getEnvironment:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
  resolve(@{
    @"adbEnabled" : @NO,
    @"rooted" : @NO,
    @"emulator" : @NO,
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAutoclickerDetectionSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"AutoclickerDetection";
}

@end
