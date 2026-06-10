import images from "@/constants/images";
import { useClerk, useUser } from "@clerk/expo";
import { styled } from "nativewind";
import { useAnalytics } from "@/lib/analytics";
import React, { useState } from "react";
import { Image, Pressable, Text, View, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/lib/i18n";
import { useMonthlyBudget, setMonthlyBudget, usePreferredCurrency, setPreferredCurrency } from "@/lib/settingsStore";
import { formatCurrency } from "@/lib/utils";
import { getDisplayRates } from "@/lib/currency";
import { clsx } from "clsx";
import { useRouter } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { trackSignOut, trackSignOutFailure, trackAppError } = useAnalytics();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const budget = useMonthlyBudget();
  const preferredCurrency = usePreferredCurrency();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget !== null ? budget.toString() : '');

  const currentLang = i18n.language || "en";

  const handleLanguageToggle = async () => {
    const nextLang = currentLang === "en" ? "tr" : "en";
    await changeLanguage(nextLang);
    if (user) {
      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            language: nextLang,
          }
        });
      } catch (e) {
        console.error("Failed to sync preferred language to Clerk:", e);
      }
    }
  };

  const emailAddress = user?.emailAddresses?.[0]?.emailAddress;
  const fallbackName = emailAddress ? emailAddress.split("@")[0] : "";
  const displayName = user?.fullName || fallbackName || t("settings.userFallback", { defaultValue: "User" });

  const handleSignOut = async () => {
    try {
      await signOut();
      trackSignOut();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("Failed to sign out:", e);
      trackSignOutFailure(errMsg);
      trackAppError("sign_out", errMsg);
    }
  };

  const handleSaveBudget = async () => {
    if (tempBudget.trim() === '') {
      await setMonthlyBudget(null);
      setEditModalVisible(false);
      return;
    }
    const parsed = parseFloat(tempBudget);
    if (!isNaN(parsed) && parsed >= 0) {
      await setMonthlyBudget(parsed);
      setEditModalVisible(false);
    }
  };

  const isValidBudget = tempBudget.trim() === '' || (!isNaN(parseFloat(tempBudget)) && parseFloat(tempBudget) >= 0);

  return (
    <SafeAreaView className="flex-1 bg-background p-5 pt-8">
      {/* Header */}
      <Text className="text-3xl font-sans-bold text-primary mb-6">
        {t("settings.title", { defaultValue: "Settings" })}
      </Text>

      {/* Profile Card */}
      {user && (
        <Pressable
          onPress={() => router.push("/profile")}
          className="flex-row items-center bg-card border border-border rounded-3xl p-5 mb-6 active:opacity-85"
        >
          <Image
            source={user.imageUrl ? { uri: user.imageUrl } : images.avatar}
            className="w-16 h-16 rounded-full border-2 border-accent"
          />
          <View className="flex-1 ml-4 justify-center">
            <Text className="text-xl font-sans-bold text-primary">
              {displayName}
            </Text>
            <Text className="text-sm font-sans-medium text-muted-foreground mt-0.5">
              {emailAddress || ""}
            </Text>
          </View>
          <Text className="text-xl font-sans-bold text-accent px-2">›</Text>
        </Pressable>
      )}

      {/* Settings Options */}
      <View className="gap-3 mb-8">
        <Pressable className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4">
          <Text className="text-base font-sans-semibold text-primary">
            {t("settings.notifications", { defaultValue: "Notifications" })}
          </Text>
          <Text className="text-sm font-sans-semibold text-accent">
            {t("settings.notificationsValue", { defaultValue: "Enabled" })}
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => {
            setTempBudget(budget !== null ? budget.toString() : '');
            setEditModalVisible(true);
          }}
          className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4"
        >
          <Text className="text-base font-sans-semibold text-primary">
            {t("settings.monthlyBudget", { defaultValue: "Monthly Budget" })}
          </Text>
          <Text className="text-sm font-sans-semibold text-accent">
            {budget !== null ? formatCurrency(budget, preferredCurrency) : t("settings.notSet", { defaultValue: "Not Set" })}
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => setCurrencyModalVisible(true)}
          className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4"
        >
          <Text className="text-base font-sans-semibold text-primary">
            {t("settings.currency", { defaultValue: "Currency" })}
          </Text>
          <Text className="text-sm font-sans-semibold text-accent">
            {preferredCurrency === 'TRY' ? 'TRY (₺)' : preferredCurrency === 'EUR' ? 'EUR (€)' : 'USD ($)'}
          </Text>
        </Pressable>

        {/* Language Row */}
        <Pressable 
          onPress={handleLanguageToggle}
          className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4"
        >
          <Text className="text-base font-sans-semibold text-primary">
            {t("settings.language", { defaultValue: "Language" })}
          </Text>
          <Text className="text-sm font-sans-semibold text-accent">
            {currentLang === "tr" ? t("settings.turkish", { defaultValue: "Türkçe" }) : t("settings.english", { defaultValue: "English" })}
          </Text>
        </Pressable>

        <Pressable className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4">
          <Text className="text-base font-sans-semibold text-primary">
            {t("settings.helpSupport", { defaultValue: "Help & Support" })}
          </Text>
        </Pressable>
      </View>

      {/* Sign Out Button */}
      <Pressable
        onPress={handleSignOut}
        className="mt-auto mb-30 items-center rounded-2xl bg-destructive py-4 border border-destructive/20"
      >
        <Text className="text-base font-sans-bold text-white">
          {t("settings.signOut", { defaultValue: "Sign Out" })}
        </Text>
      </Pressable>

      {/* Monthly Budget Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="modal-overlay justify-end">
          {/* Backdrop touch to dismiss */}
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => setEditModalVisible(false)} 
          />
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="modal-container"
          >
            <View className="modal-header">
              <Text className="modal-title">
                {t("settings.editBudgetTitle", { defaultValue: "Edit Monthly Budget" })}
              </Text>
              <Pressable className="modal-close" onPress={() => setEditModalVisible(false)}>
                <Text className="modal-close-text">✕</Text>
              </Pressable>
            </View>
            
            <ScrollView 
              contentContainerClassName="modal-body pb-10" 
              keyboardShouldPersistTaps="handled"
            >
              {/* Budget input */}
              <View className="auth-field">
                <Text className="auth-label">
                  {t("settings.monthlyBudget", { defaultValue: "Monthly Budget" })}
                </Text>
                <View className="relative justify-center">
                  <Text className="absolute left-4 z-10 text-base font-sans-bold text-primary/40">
                    {preferredCurrency === 'TRY' ? '₺' : preferredCurrency === 'EUR' ? '€' : '$'}
                  </Text>
                  <TextInput
                    className="auth-input pl-10"
                    placeholder="0.00"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    keyboardType="decimal-pad"
                    value={tempBudget}
                    onChangeText={setTempBudget}
                    autoFocus
                  />
                </View>
                <Text className="text-xs font-sans-medium text-muted-foreground/60 mt-1 pl-1">
                  {t("settings.budgetCurrencyNote", { currency: preferredCurrency, defaultValue: `Budget is managed in your global preferred currency (${preferredCurrency}).` })}
                </Text>
              </View>

              {/* Submit button */}
              <Pressable
                className={clsx("auth-button", !isValidBudget && "auth-button-disabled")}
                disabled={!isValidBudget}
                onPress={handleSaveBudget}
              >
                <Text className="auth-button-text">
                  {t("settings.save", { defaultValue: "Save" })}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Preferred Currency Selection Bottom-Sheet Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View className="modal-overlay justify-end">
          {/* Backdrop touch to dismiss */}
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => setCurrencyModalVisible(false)} 
          />
          
          <View className="modal-container">
            <View className="modal-header">
              <Text className="modal-title">
                {t("settings.selectPreferredCurrencyTitle", { defaultValue: "Select Preferred Currency" })}
              </Text>
              <Pressable className="modal-close" onPress={() => setCurrencyModalVisible(false)}>
                <Text className="modal-close-text">✕</Text>
              </Pressable>
            </View>
            
            <View className="modal-body pb-10 gap-4">
              <Text className="text-sm font-sans-semibold text-muted-foreground mb-1">
                {t("settings.selectCurrencyDesc", { defaultValue: "Choose the global currency to convert and consolidate your monthly spend and reports." })}
              </Text>
              
              <View className="picker-row">
                {(['TRY', 'USD', 'EUR'] as const).map((curr) => {
                  const isActive = preferredCurrency === curr;
                  const label = curr === 'TRY' ? '₺ TRY' : curr === 'EUR' ? '€ EUR' : '$ USD';
                  return (
                    <Pressable
                      key={curr}
                      className={clsx("picker-option", isActive && "picker-option-active")}
                      onPress={async () => {
                        await setPreferredCurrency(curr);
                        if (user) {
                          try {
                            await user.update({
                              unsafeMetadata: {
                                ...user.unsafeMetadata,
                                preferredCurrency: curr,
                              }
                            });
                          } catch (e) {
                            console.error("Failed to sync preferred currency to Clerk:", e);
                          }
                        }
                        setCurrencyModalVisible(false);
                      }}
                    >
                      <Text className={clsx("picker-option-text", isActive && "picker-option-text-active")}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="text-xs font-sans-medium text-muted-foreground/60 text-center mt-2">
                {t("settings.activeRates", { defaultValue: "Exchange Rates" })}: {getDisplayRates(preferredCurrency)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Settings;