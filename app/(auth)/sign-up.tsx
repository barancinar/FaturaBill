import { useSignUp, useAuth } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import { styled } from 'nativewind';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

const SafeAreaView = styled(RNSafeAreaView);

export default function SignUp() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  const isReady = isLoaded && !!signUp;
  const isSubmitting = isReady && fetchStatus === 'fetching';

  const handleSubmit = async () => {
    if (!isReady || !emailInput || !passwordInput) return;

    try {
      const { error } = await signUp.password({
        emailAddress: emailInput,
        password: passwordInput,
      });

      if (error) {
        console.error('Sign up error:', JSON.stringify(error, null, 2));
        return;
      }

      await signUp.verifications.sendEmailCode();
    } catch (e) {
      console.error('Exception during sign-up:', e);
    }
  };

  const handleVerify = async () => {
    if (!isReady || !codeInput) return;

    try {
      const { error } = await signUp.verifications.verifyEmailCode({
        code: codeInput,
      });

      if (error) {
        console.error('Verification error:', JSON.stringify(error, null, 2));
        return;
      }

      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log('Pending session task:', session.currentTask);
              return;
            }
            const url = decorateUrl('/');
            if (url.startsWith('http') || url.includes('://')) {
              if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
                window.location.assign(url);
              } else if (typeof window !== 'undefined' && window.location) {
                window.location.href = url;
              } else {
                router.push(url as Href);
              }
            } else {
              router.push(url as Href);
            }
          },
        });
      } else {
        console.warn('Sign-up attempt incomplete status:', signUp.status);
      }
    } catch (e) {
      console.error('Exception during verification:', e);
    }
  };

  const handleResend = async () => {
    if (!isReady) return;
    try {
      await signUp.verifications.sendEmailCode();
    } catch (e) {
      console.error('Exception during resending verification code:', e);
    }
  };

  // Render a loading state if Clerk isn't ready yet
  if (!isReady) {
    return (
      <SafeAreaView className="auth-safe-area justify-center items-center">
        <ActivityIndicator color="#081126" size="large" />
      </SafeAreaView>
    );
  }

  // Skip rendering if registration is complete or already signed in
  if (signUp.status === 'complete' || isSignedIn) {
    return null;
  }

  // Check if we need to show the email verification code screen
  const isVerifying =
    signUp?.status === 'missing_requirements' &&
    signUp?.unverifiedFields?.includes('email_address') &&
    signUp?.missingFields?.length === 0;

  // Retrieve error messages from Clerk
  const emailError = errors?.fields?.emailAddress?.message;
  const passwordError = errors?.fields?.password?.message;
  const codeError = errors?.fields?.code?.message;
  const generalError = errors?.global?.[0]?.message;

  if (isVerifying) {
    return (
      <SafeAreaView className="auth-safe-area">
        <ScrollView 
          className="auth-scroll" 
          contentContainerClassName="auth-content justify-center" 
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View className="auth-brand-block">
            <View className="auth-logo-wrap">
              <View className="auth-logo-mark">
                <Text className="auth-logo-mark-text">F</Text>
              </View>
              <View>
                <Text className="auth-wordmark">FaturaBill</Text>
                <Text className="auth-wordmark-sub">Subscription Tracker</Text>
              </View>
            </View>
            <Text className="auth-title">Verify Account</Text>
            <Text className="auth-subtitle">We have sent a verification code to your email. Enter it below to activate your account.</Text>
          </View>

          {/* Verification Card */}
          <View className="auth-card">
            {generalError ? (
              <View className="mb-4 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
                <Text className="text-sm font-sans-medium text-destructive text-center">{generalError}</Text>
              </View>
            ) : null}

            <View className="auth-form">
              <View className="auth-field">
                <Text className="auth-label">Verification Code</Text>
                <TextInput
                  className={`auth-input ${codeError ? 'auth-input-error' : ''}`}
                  keyboardType="numeric"
                  placeholder="Enter code"
                  placeholderTextColor="rgba(8, 17, 38, 0.4)"
                  value={codeInput}
                  onChangeText={setCodeInput}
                  editable={!isSubmitting}
                />
                {codeError && (
                  <Text className="auth-error">{codeError}</Text>
                )}
              </View>

              <Pressable
                className={`auth-button ${isSubmitting || !codeInput ? 'auth-button-disabled' : ''}`}
                onPress={handleVerify}
                disabled={isSubmitting || !codeInput}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#081126" size="small" />
                ) : (
                  <Text className="auth-button-text">Verify</Text>
                )}
              </Pressable>

              <Pressable
                className="auth-secondary-button"
                onPress={handleResend}
                disabled={isSubmitting}
              >
                <Text className="auth-secondary-button-text">Resend verification code</Text>
              </Pressable>

              <Pressable
                className="items-center py-2"
                onPress={async () => {
                  try {
                    if (signUp) {
                      await signUp.reset();
                    }
                    setCodeInput('');
                  } catch (e) {
                    console.error('Exception during resetting sign-up:', e);
                  }
                }}
                disabled={isSubmitting}
              >
                <Text className="text-sm font-sans-semibold text-accent underline">
                  Back to Sign Up / Change Email
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Redirect Links */}
          <View className="auth-link-row">
            <Text className="auth-link-copy">Already have an account?</Text>
            <Pressable
              onPress={async () => {
                try {
                  if (signUp) {
                    await signUp.reset();
                  }
                  setCodeInput('');
                } catch (e) {
                  console.error('Exception during resetting sign-up:', e);
                }
                router.replace('/(auth)/sign-in');
              }}
            >
              <Text className="auth-link">Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="auth-safe-area">
      <ScrollView 
        className="auth-scroll" 
        contentContainerClassName="auth-content justify-center" 
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View className="auth-brand-block">
          <View className="auth-logo-wrap">
            <View className="auth-logo-mark">
              <Text className="auth-logo-mark-text">F</Text>
            </View>
            <View>
              <Text className="auth-wordmark">FaturaBill</Text>
              <Text className="auth-wordmark-sub">Subscription Tracker</Text>
            </View>
          </View>
          <Text className="auth-title">Create Account</Text>
          <Text className="auth-subtitle">Sign up to start tracking all your active and upcoming subscriptions in one place</Text>
        </View>

        {/* Card and Form */}
        <View className="auth-card">
          {generalError ? (
            <View className="mb-4 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
              <Text className="text-sm font-sans-medium text-destructive text-center">{generalError}</Text>
            </View>
          ) : null}

          <View className="auth-form">
            {/* Email Address */}
            <View className="auth-field">
              <Text className="auth-label">Email Address</Text>
              <TextInput
                className={`auth-input ${emailError ? 'auth-input-error' : ''}`}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor="rgba(8, 17, 38, 0.4)"
                value={emailInput}
                onChangeText={setEmailInput}
                editable={!isSubmitting}
              />
              {emailError && (
                <Text className="auth-error">{emailError}</Text>
              )}
            </View>

            {/* Password */}
            <View className="auth-field">
              <Text className="auth-label">Password</Text>
              <TextInput
                className={`auth-input ${passwordError ? 'auth-input-error' : ''}`}
                secureTextEntry
                placeholder="Create a password"
                placeholderTextColor="rgba(8, 17, 38, 0.4)"
                value={passwordInput}
                onChangeText={setPasswordInput}
                editable={!isSubmitting}
              />
              {passwordError && (
                <Text className="auth-error">{passwordError}</Text>
              )}
            </View>

            {/* Submit Button */}
            <Pressable
              className={`auth-button ${isSubmitting || !emailInput || !passwordInput ? 'auth-button-disabled' : ''}`}
              onPress={handleSubmit}
              disabled={isSubmitting || !emailInput || !passwordInput}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#081126" size="small" />
              ) : (
                <Text className="auth-button-text">Sign Up</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Redirect Links */}
        <View className="auth-link-row">
          <Text className="auth-link-copy">Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="auth-link">Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}