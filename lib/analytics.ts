import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useRef } from "react";

// Event veri yapısı tanımları
export interface SubscriptionAnalyticsPayload {
  [key: string]: any;
  subscription_name: string;
  subscription_price: number;
  subscription_frequency: 'Monthly' | 'Yearly';
  subscription_category: string;
}

export function useAnalytics() {
  const posthog = usePostHog();
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // --- Kimlik Doğrulama (Auth) Akışları ---
  const trackSignInStart = useCallback(() => {
    posthog.capture("user_sign_in_started");
  }, [posthog]);

  const trackSignInSuccess = useCallback((userId: string) => {
    if (userId) {
      posthog.identify(userId);
    }
    posthog.capture("user_sign_in_completed", { user_id: userId });
  }, [posthog]);

  const trackSignInFailure = useCallback((error: string) => {
    posthog.capture("user_sign_in_failed", { error_message: error });
  }, [posthog]);

  const trackSignUpStart = useCallback(() => {
    posthog.capture("user_sign_up_started");
  }, [posthog]);

  const trackSignUpFailure = useCallback((error: string) => {
    posthog.capture("user_sign_up_failed", { error_message: error });
  }, [posthog]);

  const trackVerificationCodeSent = useCallback(() => {
    posthog.capture("verification_code_sent");
  }, [posthog]);

  const trackVerificationCodeSubmitted = useCallback(() => {
    posthog.capture("verification_code_submitted");
  }, [posthog]);

  const trackSignUpSuccess = useCallback((userId: string) => {
    if (userId) {
      posthog.identify(userId, { signUpMethod: 'email_password' });
    }
    posthog.capture("user_signed_up", { user_id: userId });
  }, [posthog]);

  const trackSignOut = useCallback(() => {
    posthog.capture("user_signed_out");
  }, [posthog]);

  const trackSignOutFailure = useCallback((error: string) => {
    posthog.capture("user_sign_out_failed", { error: error });
  }, [posthog]);

  // --- Abonelik Yaşam Döngüsü (Subscription Lifecycle) ---
  const trackSubscriptionCreateStarted = useCallback(() => {
    posthog.capture("subscription_create_started");
  }, [posthog]);

  const trackSubscriptionCreateCancelled = useCallback(() => {
    posthog.capture("subscription_create_cancelled");
  }, [posthog]);

  const trackSubscriptionCreated = useCallback((payload: SubscriptionAnalyticsPayload) => {
    posthog.capture("subscription_created", payload);
  }, [posthog]);

  const trackSubscriptionCardExpanded = useCallback((subscriptionId: string, subscriptionName: string, price: number, currency: string = "USD") => {
    posthog.capture("subscription_card_expanded", {
      subscription_id: subscriptionId,
      subscription_name: subscriptionName,
      price,
      currency,
    });
  }, [posthog]);

  const trackSubscriptionDetailsViewed = useCallback((subscriptionId: string) => {
    posthog.capture("subscription_details_viewed", { subscription_id: subscriptionId });
  }, [posthog]);

  // --- Kullanıcı Nitelikleri Güncelleme (User Properties) ---
  const updateUserProperties = useCallback((totalMonthlySpend: number, activeCount: number) => {
    posthog.setPersonProperties({
      total_monthly_spend: totalMonthlySpend,
      active_subscriptions_count: activeCount,
    });
  }, [posthog]);

  // --- Etkileşimler (Interactions) ---
  const trackSearchPerformed = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) return;

    searchTimeoutRef.current = setTimeout(() => {
      posthog.capture("subscription_search_performed", { query: query.trim() });
    }, 1000);
  }, [posthog]);

  const trackFilterChanged = useCallback((filter: string) => {
    posthog.capture("subscription_filter_changed", { filter });
  }, [posthog]);

  // --- Hata Takibi (Error Exceptions) ---
  const trackAppError = useCallback((source: string, message: string) => {
    posthog.capture("app_error_occurred", {
      error_source: source,
      error_message: message,
    });
  }, [posthog]);

  return {
    trackSignInStart,
    trackSignInSuccess,
    trackSignInFailure,
    trackSignUpStart,
    trackSignUpFailure,
    trackVerificationCodeSent,
    trackVerificationCodeSubmitted,
    trackSignUpSuccess,
    trackSignOut,
    trackSignOutFailure,
    trackSubscriptionCreateStarted,
    trackSubscriptionCreateCancelled,
    trackSubscriptionCreated,
    trackSubscriptionCardExpanded,
    trackSubscriptionDetailsViewed,
    updateUserProperties,
    trackSearchPerformed,
    trackFilterChanged,
    trackAppError,
  };
}
