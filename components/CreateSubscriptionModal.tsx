import { icons } from '@/constants/icons';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptions';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import { useAnalytics } from '@/lib/analytics';
import { usePreferredCurrency } from '@/lib/settingsStore';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

interface CreateSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (newSubscription: Subscription) => void;
}


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

export default function CreateSubscriptionModal({ visible, onClose, onCreate }: CreateSubscriptionModalProps) {
  const { t } = useTranslation();
  const { trackSubscriptionCreateStarted, trackSubscriptionCreateCancelled, trackSubscriptionCreated } = useAnalytics();
  const preferredCurrency = usePreferredCurrency();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [frequency, setFrequency] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [category, setCategory] = useState('Entertainment');

  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      if (!hasTrackedRef.current) {
        trackSubscriptionCreateStarted();
        hasTrackedRef.current = true;
      }
    } else {
      hasTrackedRef.current = false;
    }
  }, [visible, trackSubscriptionCreateStarted]);

  useEffect(() => {
    if (visible) {
      setCurrency(preferredCurrency);
    }
  }, [visible, preferredCurrency]);

  const handleClose = () => {
    // Reset form states
    setName('');
    setPrice('');
    setCurrency(preferredCurrency);
    setFrequency('Monthly');
    setCategory('Entertainment');
    onClose();
  };

  const handleCancel = () => {
    trackSubscriptionCreateCancelled();
    handleClose();
  };

  const parsedPrice = parseFloat(price);
  const isValid = name.trim().length > 0 && !isNaN(parsedPrice) && parsedPrice > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const startDate = dayjs().toISOString();
    const renewalDate = frequency === 'Monthly'
      ? dayjs().add(1, 'month').toISOString()
      : dayjs().add(1, 'year').toISOString();

    const newSub: Subscription = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      icon: icons.plus,
      name: name.trim(),
      price: parsedPrice,
      billing: frequency,
      category,
      status: 'active',
      startDate,
      renewalDate,
      color: CATEGORY_COLORS[category] || '#e2e8f0',
      currency,
    };

    onCreate(newSub);

    trackSubscriptionCreated({
      subscription_name: name.trim(),
      subscription_price: parsedPrice,
      subscription_frequency: frequency,
      subscription_category: category,
      subscription_currency: currency,
    });

    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View className="modal-overlay justify-end">
        {/* Backdrop touch to dismiss */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handleCancel} 
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="modal-container"
        >
          <View className="modal-header">
            <Text className="modal-title">{t('createModal.title', { defaultValue: 'New Subscription' })}</Text>
            <Pressable className="modal-close" onPress={handleCancel}>
              <Text className="modal-close-text">✕</Text>
            </Pressable>
          </View>
          
          <ScrollView 
            contentContainerClassName="modal-body pb-10" 
            keyboardShouldPersistTaps="handled"
          >
            {/* Name input */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.nameLabel', { defaultValue: 'Name' })}</Text>
              <TextInput
                className="auth-input"
                placeholder={t('createModal.namePlaceholder', { defaultValue: 'Subscription Name' })}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Price input */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.priceLabel', { defaultValue: 'Price' })}</Text>
              <TextInput
                className="auth-input"
                placeholder={t('createModal.pricePlaceholder', { defaultValue: '0.00' })}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            {/* Currency options */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.currencyLabel', { defaultValue: 'Currency' })}</Text>
              <View className="picker-row">
                {(['TRY', 'USD', 'EUR'] as const).map((curr) => (
                  <Pressable
                    key={curr}
                    className={clsx("picker-option", currency === curr && "picker-option-active")}
                    onPress={() => setCurrency(curr)}
                  >
                    <Text className={clsx("picker-option-text", currency === curr && "picker-option-text-active")}>
                      {curr}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Frequency options */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.frequencyLabel', { defaultValue: 'Frequency' })}</Text>
              <View className="picker-row">
                <Pressable
                  className={clsx("picker-option", frequency === "Monthly" && "picker-option-active")}
                  onPress={() => setFrequency("Monthly")}
                >
                  <Text className={clsx("picker-option-text", frequency === "Monthly" && "picker-option-text-active")}>
                    {t('createModal.frequencyMonthly', { defaultValue: 'Monthly' })}
                  </Text>
                </Pressable>
                <Pressable
                  className={clsx("picker-option", frequency === "Yearly" && "picker-option-active")}
                  onPress={() => setFrequency("Yearly")}
                >
                  <Text className={clsx("picker-option-text", frequency === "Yearly" && "picker-option-text-active")}>
                    {t('createModal.frequencyYearly', { defaultValue: 'Yearly' })}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Category selection */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.categoryLabel', { defaultValue: 'Category' })}</Text>
              <View className="category-scroll">
                {SUBSCRIPTION_CATEGORIES.map((cat) => {
                  const isActive = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      className={clsx("category-chip", isActive && "category-chip-active")}
                      onPress={() => setCategory(cat)}
                    >
                      <Text className={clsx("category-chip-text", isActive && "category-chip-text-active")}>
                        {t(`categories.${cat}`, { defaultValue: cat })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Submit button */}
            <Pressable
              className={clsx("auth-button", !isValid && "auth-button-disabled")}
              disabled={!isValid}
              onPress={handleSubmit}
            >
              <Text className="auth-button-text">{t('createModal.submit', { defaultValue: 'Add Subscription' })}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
