import { useSignIn, useSignUp } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { styled } from 'nativewind';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

const SafeAreaView = styled(RNSafeAreaView);

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();

  console.log("[SignIn] Component rendered", { fetchStatus, hasSignIn: !!signIn, hasErrors: !!errors });

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const isSubmitting = fetchStatus === 'fetching';

  const handleSubmit = async () => {
    if (!emailInput || !passwordInput) return;

    try {
      const { error } = await signIn.password({
        emailAddress: emailInput,
        password: passwordInput,
      });

      if (error) {
        console.error('Sign in error:', JSON.stringify(error, null, 2));
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log('Pending session task:', session.currentTask);
              return;
            }
            const url = decorateUrl('/');
            if (url.startsWith('http')) {
              window.location.href = url;
            } else {
              router.push(url as Href);
            }
          },
        });
      } else {
        console.warn('Sign-in status incomplete:', signIn.status);
      }
    } catch (e) {
      console.error('Exception during sign-in:', e);
    }
  };

  // Check if we have error messages from Clerk
  const identifierError = errors?.fields?.identifier?.message;
  const passwordError = errors?.fields?.password?.message;
  const generalError = errors?.global?.[0]?.message;

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
          <Text className="auth-title">Welcome Back</Text>
          <Text className="auth-subtitle">Sign in to track, manage, and optimize your recurring subscriptions</Text>
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
                className={`auth-input ${identifierError ? 'auth-input-error' : ''}`}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor="rgba(8, 17, 38, 0.4)"
                value={emailInput}
                onChangeText={setEmailInput}
                editable={!isSubmitting}
              />
              {identifierError && (
                <Text className="auth-error">{identifierError}</Text>
              )}
            </View>

            {/* Password */}
            <View className="auth-field">
              <Text className="auth-label">Password</Text>
              <TextInput
                className={`auth-input ${passwordError ? 'auth-input-error' : ''}`}
                secureTextEntry
                placeholder="Enter your password"
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
                <Text className="auth-button-text">Sign In</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Redirect Links */}
        <View className="auth-link-row">
          <Text className="auth-link-copy">Don't have an account?</Text>
          <Pressable
            onPress={async () => {
              try {
                if (signUp) {
                  await signUp.reset();
                }
              } catch (e) {
                console.error('Exception during resetting sign-up:', e);
              }
              router.push('/(auth)/sign-up');
            }}
          >
            <Text className="auth-link">Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}