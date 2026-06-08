import "@/global.css";
import { initLanguage } from "@/lib/i18n";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { tokenCache } from "@/clerk/tokenCache";
import { PostHogProvider, usePostHog } from "posthog-react-native";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY!;

if (!posthogApiKey) {
  throw new Error("Add your EXPO_PUBLIC_POSTHOG_API_KEY to the .env file");
}

const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST!;

if (!posthogHost) {
  throw new Error("Add your EXPO_PUBLIC_POSTHOG_HOST to the .env file");
}

function InitialLayout() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const posthog = usePostHog();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  console.log("[InitialLayout] Rendered", { isLoaded, isSignedIn, segments, navReady: !!navigationState?.key });

  // Sync user authentication status to PostHog session
  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      posthog.identify(userId);
    } else if (isLoaded && !isSignedIn) {
      posthog.reset();
    }
  }, [isLoaded, isSignedIn, userId, posthog]);

  // Automatic Screen View Tracking
  useEffect(() => {
    if (isLoaded && segments.length > 0) {
      const screenName = segments.join('/');
      posthog.screen(screenName);
    }
  }, [segments, isLoaded, posthog]);

  useEffect(() => {
    console.log("[InitialLayout] Effect running", { isLoaded, isSignedIn, segments, navReady: !!navigationState?.key });
    if (!isLoaded || !navigationState?.key) return;

    // Check if the user is in the auth group or onboarding screen
    const inAuthGroup = segments[0] === "(auth)";
    const isOnboarding = segments[0] === "onboarding";

    console.log("[InitialLayout] Nav guard evaluation:", { inAuthGroup, isOnboarding });

    if (isSignedIn && (inAuthGroup || isOnboarding)) {
      console.log("[InitialLayout] Redirecting to /");
      // Redirect authenticated user to the main tabs dashboard (route is '/')
      router.replace("/");
    } else if (!isSignedIn && !inAuthGroup && !isOnboarding) {
      console.log("[InitialLayout] Redirecting to /sign-in");
      // Redirect unauthenticated user to the sign-in page
      router.replace("/sign-in");
    }
  }, [isSignedIn, isLoaded, segments, navigationState?.key]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [i18nInitialized, setI18nInitialized] = useState(false);
  const [fontsLoaded] = useFonts({
    'sans-regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'sans-medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'sans-semibold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'sans-bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'sans-extrabold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'sans-light': require('../assets/fonts/PlusJakartaSans-Light.ttf'),
  });

  useEffect(() => {
    initLanguage().finally(() => {
      setI18nInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded && i18nInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nInitialized]);

  if (!fontsLoaded || !i18nInitialized) {
    return null;
  }



  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <PostHogProvider
          apiKey={posthogApiKey}
          options={{
            host: posthogHost,
          }}
        >
          <InitialLayout />
        </PostHogProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
