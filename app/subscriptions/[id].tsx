import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { styled } from 'nativewind';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import clsx from 'clsx';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptions';
import "@/global.css";
import { formatCurrency, formatSubscriptionDateTime } from '@/lib/utils';
import { getSubscriptions, updateSubscription, deleteSubscription } from '@/lib/store';

const SafeAreaView = styled(RNSafeAreaView);

const ALLOWED_CURRENCIES = ['USD', 'TRY', 'EUR'] as const;
type CurrencyType = typeof ALLOWED_CURRENCIES[number];

const isValidCurrency = (val: any): val is CurrencyType => {
  return typeof val === 'string' && (ALLOWED_CURRENCIES as readonly string[]).includes(val);
};

// Centralized translation resource dictionaries are configured in lib/i18n

const CATEGORY_COLORS: Record<string, string> = {
  "Entertainment": "#ffd1d1",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  "Design": "#f5c542",
  "Productivity": "#ffe5d9",
  "Cloud": "#d0ebff",
  "Music": "#d3f9d8",
  "Other": "#e2e8f0"
};

const SubscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const posthog = usePostHog();

  // Component loading states

  const [sub, setSub] = useState<Subscription | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State variables
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [billing, setBilling] = useState('Monthly');
  const [category, setCategory] = useState('Entertainment');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [isTrial, setIsTrial] = useState(false);

  // Fetch subscription from global list on mount / focus
  useEffect(() => {
    const found = getSubscriptions().find(s => s.id === id);
    if (found) {
      setSub(found);
      // Initialize form variables
      setName(found.name);
      setPrice(found.price.toString());
      setCurrency(isValidCurrency(found.currency) ? found.currency : 'USD');
      setBilling(found.billing);
      setCategory(found.category || 'Other');
      setPaymentMethod(found.paymentMethod || '');
      setRenewalDate(found.renewalDate ? dayjs(found.renewalDate).format('YYYY-MM-DD') : '');
      setIsTrial(found.isTrial === true);
    }
  }, [id]);

  if (!sub) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-5">
        <Text className="text-lg font-sans-bold text-primary">
          {t('details.subscriptionNotFound', { defaultValue: 'Subscription not found' })}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 bg-primary rounded-full"
        >
          <Text className="text-white font-sans-semibold">
            {t('details.back', { defaultValue: 'Back' })}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    const parsedPrice = parseFloat(price);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert(t("details.error", { defaultValue: "Error" }), t("details.errorFillFields", { defaultValue: "Please provide a valid name and price." }));
      return;
    }

    // Validate date format
    const parsedDate = dayjs(renewalDate, 'YYYY-MM-DD', true);
    let finalRenewalDate = sub.renewalDate;
    if (renewalDate) {
      if (!parsedDate.isValid()) {
        Alert.alert(t("details.error", { defaultValue: "Error" }), t("details.errorDateFormat", { defaultValue: "Please input date in YYYY-MM-DD format." }));
        return;
      }
      finalRenewalDate = parsedDate.toISOString();
    }

    const updatedSub: Subscription = {
      ...sub,
      name: name.trim(),
      price: parsedPrice,
      currency,
      billing,
      category,
      paymentMethod: paymentMethod.trim(),
      renewalDate: finalRenewalDate,
      isTrial,
      color: CATEGORY_COLORS[category] || '#e2e8f0'
    };

    try {
      // Update in global store
      await updateSubscription(id, updatedSub);
      setSub(updatedSub);
      setIsEditing(false);
      posthog.capture("subscription_updated", { id, name: name.trim(), price: parsedPrice });
    } catch (error) {
      console.error("Failed to save subscription in SQLite:", error);
      Alert.alert(
        t("details.error", { defaultValue: "Error" }),
        t("details.errorSaveFailed", { defaultValue: "Failed to save subscription. Please try again." })
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('details.deleteConfirmTitle', 'Delete Subscription'),
      t('details.deleteConfirmDesc', 'Are you sure you want to delete this subscription?'),
      [
        { text: t('details.deleteConfirmNo', 'Cancel'), style: 'cancel' },
        {
          text: t('details.deleteConfirmYes', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubscription(id);
              posthog.capture("subscription_deleted", { id, name: sub.name });
              router.replace("/");
            } catch (error) {
              console.error("Failed to delete subscription in SQLite:", error);
              Alert.alert(
                t("details.error", { defaultValue: "Error" }),
                t("details.errorDeleteFailed", { defaultValue: "Failed to delete subscription. Please try again." })
              );
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (newStatus: 'active' | 'paused' | 'cancelled') => {
    const updatedSub: Subscription = {
      ...sub,
      status: newStatus
    };

    try {
      await updateSubscription(id, updatedSub);
      setSub(updatedSub);
      posthog.capture("subscription_status_changed", { id, status: newStatus });
    } catch (error) {
      console.error("Failed to update status in SQLite:", error);
      Alert.alert(
        t("details.error", { defaultValue: "Error" }),
        t("details.errorUpdateStatus", { defaultValue: "Failed to update subscription status. Please try again." })
      );
    }
  };

  // Calculations for Trial countdown
  const daysLeftOfTrial = sub.renewalDate ? dayjs(sub.renewalDate).diff(dayjs(), 'day') : -1;

  return (
    <SafeAreaView className="flex-1 bg-background p-5 pt-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity
          onPress={() => (isEditing ? setIsEditing(false) : router.back())}
          className="size-11 bg-card border border-border rounded-full items-center justify-center"
        >
          <Feather name="arrow-left" size={20} color="#081126" />
        </TouchableOpacity>

        <Text className="text-2xl font-sans-bold text-primary">
          {isEditing ? t('details.edit', 'Edit') : t('details.title', 'Details')}
        </Text>

        <TouchableOpacity
          onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="bg-primary px-5 py-2.5 rounded-full"
        >
          <Text className="text-white text-sm font-sans-bold">
            {isEditing ? t('details.save', 'Save') : t('details.edit', 'Edit')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Main Banner Card */}
        <View
          className="rounded-3xl p-8 items-center justify-center mb-6 border border-border"
          style={{ backgroundColor: sub.color || '#e2e8f0' }}
        >
          <View className="size-24 rounded-2xl bg-white/80 items-center justify-center p-4 mb-4 border border-black/5">
            <Image source={sub.icon} className="w-full h-full" resizeMode="contain" />
          </View>

          {isEditing ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Subscription Name"
              style={{ textAlign: 'center' }}
              className="text-3xl font-sans-extrabold text-primary bg-white/50 border border-black/10 rounded-xl px-4 py-1.5 w-full mb-2"
            />
          ) : (
            <Text className="text-3xl font-sans-extrabold text-primary mb-1 text-center" numberOfLines={1}>
              {sub.name}
            </Text>
          )}

          {isEditing ? (
            <View className="flex-row items-center justify-center gap-2 mb-3">
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={{ textAlign: 'center' }}
                className="text-xl font-sans-bold text-primary bg-white/50 border border-black/10 rounded-xl px-4 py-1 w-32"
              />
            </View>
          ) : (
            <Text className="text-4xl font-sans-extrabold text-primary mb-2">
              {formatCurrency(sub.price, sub.currency || 'USD')}
              <Text className="text-base font-sans-semibold text-primary/70">
                /{sub.billing === "Monthly" ? t('common.monthly', { defaultValue: 'Monthly' }).toLocaleLowerCase(i18n.language) : t('common.yearly', { defaultValue: 'Yearly' }).toLocaleLowerCase(i18n.language)}
              </Text>
            </Text>
          )}

          {/* Trial / Regular Badge */}
          {isEditing ? (
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-sm font-sans-bold text-primary/80">{t('details.fields.isTrial')}</Text>
              <Switch value={isTrial} onValueChange={setIsTrial} />
            </View>
          ) : (
            <View className="mt-1">
              {sub.isTrial ? (
                <View className="bg-accent/25 px-5 py-2 rounded-full border border-accent/20">
                  <Text className="text-sm font-sans-bold text-accent">
                    {daysLeftOfTrial >= 0
                      ? t('details.trialCountdown', { defaultValue: '{{count}} days left of trial', count: daysLeftOfTrial })
                      : t('details.trialExpired', 'Trial expired')}
                  </Text>
                </View>
              ) : (
                <View className="bg-primary/10 px-5 py-2 rounded-full border border-primary/10">
                  <Text className="text-sm font-sans-bold text-primary/80">
                    {t('details.regularSubscription', 'Regular Subscription')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Read-Only Details List */}
        {!isEditing ? (
          <View className="bg-card border border-border rounded-3xl p-5 gap-4 mb-6">
            {/* Status */}
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-sm font-sans-semibold text-muted-foreground">
                {t('details.fields.status', { defaultValue: 'Status' })}
              </Text>
              <Text className={clsx("text-base font-sans-bold", sub.status === 'active' ? "text-success" : sub.status === 'paused' ? "text-accent" : "text-muted-foreground")}>
                {sub.status === 'active'
                  ? t('details.activeStatus', { defaultValue: 'Active' })
                  : sub.status === 'paused'
                    ? t('details.pausedStatus', { defaultValue: 'Paused' })
                    : t('details.cancelledStatus', { defaultValue: 'Cancelled' })}
              </Text>
            </View>

            {/* Category */}
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.category')}</Text>
              <Text className="text-base font-sans-bold text-primary">
                {sub.category ? t(`categories.${sub.category}`, { defaultValue: sub.category }) : t('categories.Other', { defaultValue: 'Other' })}
              </Text>
            </View>

            {/* Billing */}
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.billing')}</Text>
              <Text className="text-base font-sans-bold text-primary">
                {sub.billing === "Monthly" ? t('common.monthly', { defaultValue: 'Monthly' }) : t('common.yearly', { defaultValue: 'Yearly' })}
              </Text>
            </View>

            {/* Payment Method */}
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.paymentMethod')}</Text>
              <Text className="text-base font-sans-bold text-primary" numberOfLines={1}>
                {sub.paymentMethod || t('card.notProvided', { defaultValue: 'Not Provided' })}
              </Text>
            </View>

            {/* Start Date */}
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-sm font-sans-semibold text-muted-foreground">
                {t('details.fields.started', { defaultValue: 'Started' })}
              </Text>
              <Text className="text-base font-sans-bold text-primary">
                {formatSubscriptionDateTime(sub.startDate)}
              </Text>
            </View>

            {/* Next Renewal */}
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.renewalDate')}</Text>
              <Text className="text-base font-sans-bold text-primary">
                {formatSubscriptionDateTime(sub.renewalDate)}
              </Text>
            </View>
          </View>
        ) : (
          /* Edit Mode Input Forms */
          <View className="bg-card border border-border rounded-3xl p-5 gap-4 mb-6">

            {/* Currency Switcher */}
            <View className="gap-1.5">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.currency')}</Text>
              <View className="flex-row gap-2 mt-1">
                {(['USD', 'TRY', 'EUR'] as const).map(curr => (
                  <TouchableOpacity
                    key={curr}
                    onPress={() => setCurrency(curr)}
                    className={clsx("px-5 py-2.5 rounded-xl border", currency === curr ? "bg-primary border-primary" : "bg-background border-border")}
                  >
                    <Text className={clsx("text-sm font-sans-bold", currency === curr ? "text-white" : "text-primary")}>{curr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Billing Cycle switcher */}
            <View className="gap-1.5">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.billing')}</Text>
              <View className="flex-row gap-2 mt-1">
                {['Monthly', 'Yearly'].map(cycle => (
                  <TouchableOpacity
                    key={cycle}
                    onPress={() => setBilling(cycle)}
                    className={clsx("px-5 py-2.5 rounded-xl border", billing === cycle ? "bg-primary border-primary" : "bg-background border-border")}
                  >
                    <Text className={clsx("text-sm font-sans-bold", billing === cycle ? "text-white" : "text-primary")}>
                      {cycle === "Monthly" ? t('common.monthly', { defaultValue: 'Monthly' }) : t('common.yearly', { defaultValue: 'Yearly' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category selection */}
            <View className="gap-1.5">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="mt-1">
                {SUBSCRIPTION_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={clsx("px-4 py-2.5 rounded-full border", category === cat ? "bg-primary border-primary" : "bg-background border-border")}
                  >
                    <Text className={clsx("text-sm font-sans-bold", category === cat ? "text-white" : "text-primary")}>
                      {t(`categories.${cat}`, { defaultValue: cat })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Payment Method input */}
            <View className="gap-1.5">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.paymentMethod')}</Text>
              <TextInput
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="Visa ending in 0000"
                className="bg-background border border-border rounded-xl px-4.5 py-3.5 text-base font-sans-semibold text-primary"
              />
            </View>

            {/* Renewal Date input */}
            <View className="gap-1.5">
              <Text className="text-sm font-sans-semibold text-muted-foreground">{t('details.fields.renewalDate')}</Text>
              <TextInput
                value={renewalDate}
                onChangeText={setRenewalDate}
                placeholder="YYYY-MM-DD"
                className="bg-background border border-border rounded-xl px-4.5 py-3.5 text-base font-sans-semibold text-primary"
              />
            </View>
          </View>
        )}

        {/* Read-Only Status & Actions Section */}
        {!isEditing && (
          <View className="gap-3">
            {/* Active Status Actions */}
            {sub.status === 'active' && (
              <TouchableOpacity
                onPress={() => handleToggleStatus('paused')}
                className="flex-row items-center justify-center bg-card border border-accent/25 rounded-2xl py-4.5 gap-2"
              >
                <Feather name="pause" size={20} color="#ea7a53" />
                <Text className="text-base font-sans-bold text-accent">
                  {t('details.pause', 'Pause')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Paused Status Actions */}
            {sub.status === 'paused' && (
              <TouchableOpacity
                onPress={() => handleToggleStatus('active')}
                className="flex-row items-center justify-center bg-card border border-success/25 rounded-2xl py-4.5 gap-2"
              >
                <Feather name="play" size={20} color="#16a34a" />
                <Text className="text-base font-sans-bold text-success">
                  {t('details.resume', 'Resume')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Active/Paused Cancel Action */}
            {sub.status !== 'cancelled' && (
              <TouchableOpacity
                onPress={() => handleToggleStatus('cancelled')}
                className="flex-row items-center justify-center bg-card border border-border rounded-2xl py-4.5 gap-2"
              >
                <Feather name="x-circle" size={20} color="rgba(0, 0, 0, 0.6)" />
                <Text className="text-base font-sans-bold text-muted-foreground">
                  {t('details.cancelSubscription', 'Cancel Subscription')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Restore Cancelled to Active */}
            {sub.status === 'cancelled' && (
              <TouchableOpacity
                onPress={() => handleToggleStatus('active')}
                className="flex-row items-center justify-center bg-primary rounded-2xl py-4.5 gap-2"
              >
                <Feather name="refresh-cw" size={20} color="white" />
                <Text className="text-base font-sans-bold text-white">
                  {t('details.resume', 'Resume')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete button (destructive) */}
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center justify-center bg-destructive/10 border border-destructive/20 rounded-2xl py-4.5 gap-2 mt-4"
            >
              <Feather name="trash-2" size={20} color="#dc2626" />
              <Text className="text-base font-sans-bold text-destructive">
                {t('details.delete', 'Delete')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default SubscriptionDetails;