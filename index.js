/* eslint-disable */
// Monkey-patch Expo Router's internal SplashScreen module to prevent uncaught native rejections on Expo Go / Android reloads.
try {
  const SplashScreenInternal = require("expo-router/build/utils/splash");
  if (SplashScreenInternal) {
    if (SplashScreenInternal._internal_preventAutoHideAsync) {
      const orig = SplashScreenInternal._internal_preventAutoHideAsync;
      SplashScreenInternal._internal_preventAutoHideAsync = function () {
        return orig.apply(this, arguments).catch(() => false);
      };
    }
    if (SplashScreenInternal.preventAutoHideAsync) {
      const orig = SplashScreenInternal.preventAutoHideAsync;
      SplashScreenInternal.preventAutoHideAsync = function () {
        return orig.apply(this, arguments).catch(() => false);
      };
    }
    if (SplashScreenInternal.hideAsync) {
      const orig = SplashScreenInternal.hideAsync;
      SplashScreenInternal.hideAsync = function () {
        return orig.apply(this, arguments).catch(() => {});
      };
    }
  }
} catch (e) {
  console.warn("Failed to patch Expo Router SplashScreen", e);
}

// Load the actual Expo Router entry point
require("expo-router/entry");
