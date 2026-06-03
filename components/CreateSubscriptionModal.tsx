import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import { icons } from '@/constants/icons';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptions';

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
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [frequency, setFrequency] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [category, setCategory] = useState('Entertainment');

  const handleClose = () => {
    // Reset form states
    setName('');
    setPrice('');
    setFrequency('Monthly');
    setCategory('Entertainment');
    onClose();
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
      icon: icons.wallet,
      name: name.trim(),
      price: parsedPrice,
      billing: frequency,
      category,
      status: 'active',
      startDate,
      renewalDate,
      color: CATEGORY_COLORS[category] || '#e2e8f0',
      currency: 'USD',
    };

    onCreate(newSub);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="modal-overlay justify-end">
        {/* Backdrop touch to dismiss */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handleClose} 
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="modal-container"
        >
          <View className="modal-header">
            <Text className="modal-title">New Subscription</Text>
            <Pressable className="modal-close" onPress={handleClose}>
              <Text className="modal-close-text">✕</Text>
            </Pressable>
          </View>
          
          <ScrollView 
            contentContainerClassName="modal-body pb-10" 
            keyboardShouldPersistTaps="handled"
          >
            {/* Name input */}
            <View className="auth-field">
              <Text className="auth-label">Name</Text>
              <TextInput
                className="auth-input"
                placeholder="Subscription Name"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Price input */}
            <View className="auth-field">
              <Text className="auth-label">Price</Text>
              <TextInput
                className="auth-input"
                placeholder="0.00"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            {/* Frequency options */}
            <View className="auth-field">
              <Text className="auth-label">Frequency</Text>
              <View className="picker-row">
                <Pressable
                  className={clsx("picker-option", frequency === "Monthly" && "picker-option-active")}
                  onPress={() => setFrequency("Monthly")}
                >
                  <Text className={clsx("picker-option-text", frequency === "Monthly" && "picker-option-text-active")}>
                    Monthly
                  </Text>
                </Pressable>
                <Pressable
                  className={clsx("picker-option", frequency === "Yearly" && "picker-option-active")}
                  onPress={() => setFrequency("Yearly")}
                >
                  <Text className={clsx("picker-option-text", frequency === "Yearly" && "picker-option-text-active")}>
                    Yearly
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Category selection */}
            <View className="auth-field">
              <Text className="auth-label">Category</Text>
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
                        {cat}
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
              <Text className="auth-button-text">Add Subscription</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
