/* eslint-disable no-undef */
const { SplashScreen } = require("expo-router");

try {
  SplashScreen.preventAutoHideAsync().catch(() => {
    /* Prevent uncaught native rejections on hot reload */
  });
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("Failed to prevent splash screen auto hide", e);
}

// Load the actual Expo Router entry point
require("expo-router/entry");
