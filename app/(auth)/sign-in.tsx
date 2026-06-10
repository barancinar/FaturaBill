import { useSignIn, useSignUp, useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { styled } from 'nativewind';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useAnalytics } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

const SafeAreaView = styled(RNSafeAreaView);

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { signUp } = useSignUp();
  const { isLoaded } = useAuth();
  const router = useRouter();
  const { trackSignInStart, trackSignInSuccess, trackSignInFailure, trackAppError } = useAnalytics();
  const { t } = useTranslation();

  // Load translations dynamically for Sign In
  React.useEffect(() => {
    if (i18n.isInitialized) {
      i18n.addResourceBundle('en', 'translation', {
        common: {
          appName: "FaturaBill",
          appSubtitle: "Subscription Tracker"
        },
        auth: {
          title: "Welcome Back",
          subtitle: "Sign in to track, manage, and optimize your recurring subscriptions",
          emailLabel: "Email Address",
          emailPlaceholder: "Enter your email",
          passwordLabel: "Password",
          passwordPlaceholder: "Enter your password",
          buttonSignIn: "Sign In",
          dontHaveAccount: "Don't have an account?",
          linkSignUp: "Sign up",
          mfa: {
            title: "Two-Factor Verification",
            totpSubtitle: "Enter the code from your authenticator app to sign in.",
            phoneSubtitle: "We have sent a verification code to your phone. Enter it below to sign in.",
            emailSubtitle: "We have sent a verification code to your email. Enter it below to sign in.",
            codeLabel: "Verification Code",
            codePlaceholder: "Enter code",
            buttonVerify: "Verify",
            buttonResend: "Resend verification code",
            backToSignIn: "Back to Sign In"
          }
        }
      }, true, true);
      i18n.addResourceBundle('tr', 'translation', {
        common: {
          appName: "FaturaBill",
          appSubtitle: "Abonelik Takipçisi"
        },
        auth: {
          title: "Tekrar Hoş Geldiniz",
          subtitle: "Tekrarlanan aboneliklerinizi takip etmek, yönetmek ve optimize etmek için giriş yapın",
          emailLabel: "E-posta Adresi",
          emailPlaceholder: "E-postanızı girin",
          passwordLabel: "Şifre",
          passwordPlaceholder: "Şifrenizi girin",
          buttonSignIn: "Giriş Yap",
          dontHaveAccount: "Hesabınız yok mu?",
          linkSignUp: "Kayıt ol",
          mfa: {
            title: "İki Adımlı Doğrulama",
            totpSubtitle: "Giriş yapmak için kimlik doğrulama uygulamanızdaki kodu girin.",
            phoneSubtitle: "Telefonunuza bir doğrulama kodu gönderdik. Giriş yapmak için aşağıya girin.",
            emailSubtitle: "E-postanıza bir doğrulama kodu gönderdik. Giriş yapmak için aşağıya girin.",
            codeLabel: "Doğrulama Kodu",
            codePlaceholder: "Kodu girin",
            buttonVerify: "Doğrula",
            buttonResend: "Doğrulama kodunu tekrar gönder",
            backToSignIn: "Giriş Ekranına Dön"
          }
        }
      }, true, true);
    }
  }, []);

  console.log("[SignIn] Component rendered", { fetchStatus, hasSignIn: !!signIn, hasErrors: !!errors });

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStrategy, setMfaStrategy] = useState<any>(null);

  const isReady = isLoaded;
  const isSubmitting = fetchStatus === 'fetching';

  const handleSubmit = async () => {
    if (!isReady || !emailInput || !passwordInput) return;

    trackSignInStart();
    try {
      const { error } = await signIn.password({
        emailAddress: emailInput,
        password: passwordInput,
      });

      if (error) {
        const errorMsg = typeof error === 'string' ? error : JSON.stringify(error);
        console.error('Sign in error:', errorMsg);
        trackSignInFailure(errorMsg);
        return;
      }

      if (signIn.status === 'complete') {
        let userId = '';

        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.user?.id) {
              userId = session.user.id;
            }
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

        trackSignInSuccess(userId);
      } else if (signIn.status === 'needs_second_factor') {
        console.log('SignIn status is needs_second_factor. Supported factors:', signIn.supportedSecondFactors);
        const factors = signIn.supportedSecondFactors || [];
        const totp = factors.find(f => f.strategy === 'totp');
        const phone = factors.find(f => f.strategy === 'phone_code');
        const email = factors.find(f => f.strategy === 'email_code');

        if (totp) {
          setMfaStrategy('totp');
          setIsVerifyingMfa(true);
        } else if (phone) {
          setMfaStrategy('phone_code');
          const { error } = await signIn.mfa.sendPhoneCode();
          if (error) {
            const errorMsg = typeof error === 'string' ? error : JSON.stringify(error);
            console.error('MFA phone code send error:', errorMsg);
            trackSignInFailure(errorMsg);
            return;
          }
          setIsVerifyingMfa(true);
        } else if (email) {
          setMfaStrategy('email_code');
          const { error } = await signIn.mfa.sendEmailCode();
          if (error) {
            const errorMsg = typeof error === 'string' ? error : JSON.stringify(error);
            console.error('MFA email code send error:', errorMsg);
            trackSignInFailure(errorMsg);
            return;
          }
          setIsVerifyingMfa(true);
        } else {
          console.warn('No supported second factor strategy found among:', factors);
          trackSignInFailure(`Unsupported second factor strategies: ${JSON.stringify(factors)}`);
        }
      } else {
        console.warn('Sign-in status incomplete:', signIn.status);
        trackSignInFailure(`Incomplete status: ${signIn.status}`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Exception during sign-in:', e);
      trackSignInFailure(errMsg);
      trackAppError('sign_in', errMsg);
    }
  };

  const handleVerifyMfa = async () => {
    if (!isReady || !mfaCode || !mfaStrategy) return;

    try {
      let resultError: any = null;

      if (mfaStrategy === 'totp') {
        const { error } = await signIn.mfa.verifyTOTP({ code: mfaCode });
        resultError = error;
      } else if (mfaStrategy === 'phone_code') {
        const { error } = await signIn.mfa.verifyPhoneCode({ code: mfaCode });
        resultError = error;
      } else if (mfaStrategy === 'email_code') {
        const { error } = await signIn.mfa.verifyEmailCode({ code: mfaCode });
        resultError = error;
      }

      if (resultError) {
        const errorMsg = typeof resultError === 'string' ? resultError : JSON.stringify(resultError);
        console.error('MFA verification error:', errorMsg);
        trackSignInFailure(errorMsg);
        return;
      }

      if (signIn.status === 'complete') {
        let userId = '';

        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.user?.id) {
              userId = session.user.id;
            }
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

        trackSignInSuccess(userId);
      } else {
        console.warn('MFA Sign-in status incomplete:', signIn.status);
        trackSignInFailure(`MFA Incomplete status: ${signIn.status}`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Exception during MFA verification:', e);
      trackSignInFailure(errMsg);
      trackAppError('mfa_verify', errMsg);
    }
  };

  const handleResendMfa = async () => {
    if (!isReady || !mfaStrategy || mfaStrategy === 'totp') return;
    try {
      if (mfaStrategy === 'phone_code') {
        const { error } = await signIn.mfa.sendPhoneCode();
        if (error) {
          console.error('MFA resend phone code error:', error);
        }
      } else if (mfaStrategy === 'email_code') {
        const { error } = await signIn.mfa.sendEmailCode();
        if (error) {
          console.error('MFA resend email code error:', error);
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Exception during resending MFA code:', e);
      trackAppError('mfa_resend', errMsg);
    }
  };

  // Check if we have error messages from Clerk
  const identifierError = errors?.fields?.identifier?.message;
  const passwordError = errors?.fields?.password?.message;
  const codeError = errors?.fields?.code?.message;
  const generalError = errors?.global?.[0]?.message;

  if (isVerifyingMfa) {
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
                <Text className="auth-wordmark">{t('common.appName', 'FaturaBill')}</Text>
                <Text className="auth-wordmark-sub">{t('common.appSubtitle', 'Subscription Tracker')}</Text>
              </View>
            </View>
            <Text className="auth-title">{t('auth.mfa.title', 'Two-Factor Verification')}</Text>
            <Text className="auth-subtitle">
              {mfaStrategy === 'totp' 
                ? t('auth.mfa.totpSubtitle', 'Enter the code from your authenticator app to sign in.') 
                : mfaStrategy === 'phone_code'
                ? t('auth.mfa.phoneSubtitle', 'We have sent a verification code to your phone. Enter it below to sign in.')
                : t('auth.mfa.emailSubtitle', 'We have sent a verification code to your email. Enter it below to sign in.')}
            </Text>
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
                <Text className="auth-label">{t('auth.mfa.codeLabel', 'Verification Code')}</Text>
                <TextInput
                  className={`auth-input ${codeError ? 'auth-input-error' : ''}`}
                  keyboardType="numeric"
                  placeholder={t('auth.mfa.codePlaceholder', 'Enter code')}
                  placeholderTextColor="rgba(8, 17, 38, 0.4)"
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  editable={!isSubmitting}
                />
                {codeError && (
                  <Text className="auth-error">{codeError}</Text>
                )}
              </View>

              <Pressable
                className={`auth-button ${isSubmitting || !mfaCode ? 'auth-button-disabled' : ''}`}
                onPress={handleVerifyMfa}
                disabled={isSubmitting || !mfaCode}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#081126" size="small" />
                ) : (
                  <Text className="auth-button-text">{t('auth.mfa.buttonVerify', 'Verify')}</Text>
                )}
              </Pressable>

              {mfaStrategy !== 'totp' && (
                <Pressable
                  className="auth-secondary-button"
                  onPress={handleResendMfa}
                  disabled={isSubmitting}
                >
                  <Text className="auth-secondary-button-text">{t('auth.mfa.buttonResend', 'Resend verification code')}</Text>
                </Pressable>
              )}

              <Pressable
                className="items-center py-2"
                onPress={() => {
                  setIsVerifyingMfa(false);
                  setMfaCode('');
                  setMfaStrategy(null);
                }}
                disabled={isSubmitting}
              >
                <Text className="text-sm font-sans-semibold text-accent underline">
                  {t('auth.mfa.backToSignIn', 'Back to Sign In')}
                </Text>
              </Pressable>
            </View>
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
              <Text className="auth-wordmark">{t('common.appName', 'FaturaBill')}</Text>
              <Text className="auth-wordmark-sub">{t('common.appSubtitle', 'Subscription Tracker')}</Text>
            </View>
          </View>
          <Text className="auth-title">{t('auth.title', 'Welcome Back')}</Text>
          <Text className="auth-subtitle">{t('auth.subtitle', 'Sign in to track, manage, and optimize your recurring subscriptions')}</Text>
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
              <Text className="auth-label">{t('auth.emailLabel', 'Email Address')}</Text>
              <TextInput
                className={`auth-input ${identifierError ? 'auth-input-error' : ''}`}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder={t('auth.emailPlaceholder', 'Enter your email')}
                placeholderTextColor="rgba(8, 17, 38, 0.4)"
                value={emailInput}
                onChangeText={setEmailInput}
                editable={isReady && !isSubmitting}
              />
              {identifierError && (
                <Text className="auth-error">{identifierError}</Text>
              )}
            </View>

            {/* Password */}
            <View className="auth-field">
              <Text className="auth-label">{t('auth.passwordLabel', 'Password')}</Text>
              <TextInput
                className={`auth-input ${passwordError ? 'auth-input-error' : ''}`}
                secureTextEntry
                placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                placeholderTextColor="rgba(8, 17, 38, 0.4)"
                value={passwordInput}
                onChangeText={setPasswordInput}
                editable={isReady && !isSubmitting}
              />
              {passwordError && (
                <Text className="auth-error">{passwordError}</Text>
              )}
            </View>

            {/* Submit Button */}
            <Pressable
              className={`auth-button ${isSubmitting || !isReady || !emailInput || !passwordInput ? 'auth-button-disabled' : ''}`}
              onPress={handleSubmit}
              disabled={isSubmitting || !isReady || !emailInput || !passwordInput}
            >
              {isSubmitting || !isReady ? (
                <ActivityIndicator color="#081126" size="small" />
              ) : (
                <Text className="auth-button-text">{t('auth.buttonSignIn', 'Sign In')}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Redirect Links */}
        <View className="auth-link-row">
          <Text className="auth-link-copy">{t('auth.dontHaveAccount', "Don't have an account?")}</Text>
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
            <Text className="auth-link">{t('auth.linkSignUp', 'Sign up')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}