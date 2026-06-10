import React, { useMemo } from 'react';
import { Modal, ScrollView, View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useSubscriptions } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { usePreferredCurrency } from '@/lib/settingsStore';
import { convertCurrency } from '@/lib/currency';

interface UpcomingPaymentsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function UpcomingPaymentsModal({ visible, onClose }: UpcomingPaymentsModalProps) {
  const { t } = useTranslation();
  const subscriptions = useSubscriptions();
  const preferredCurrency = usePreferredCurrency();

  // 1. Process active subscriptions and calculate days remaining safely
  const processedSubscriptions = useMemo(() => {
    const today = dayjs().startOf('day');
    return subscriptions
      .filter((sub) => sub.status === 'active' && sub.renewalDate)
      .map((sub) => {
        const renewalDate = dayjs(sub.renewalDate).startOf('day');
        const daysLeft = renewalDate.diff(today, 'day');
        return {
          ...sub,
          daysLeft: daysLeft,
        };
      })
      .filter((sub) => sub.daysLeft >= 0 && sub.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subscriptions]);

  // 2. Group subscriptions into chronological timeline categories
  const groupedTimeline = useMemo(() => {
    const thisWeek: typeof processedSubscriptions = [];
    const nextWeek: typeof processedSubscriptions = [];
    const restOfMonth: typeof processedSubscriptions = [];

    processedSubscriptions.forEach((sub) => {
      if (sub.daysLeft <= 7) {
        thisWeek.push(sub);
      } else if (sub.daysLeft <= 14) {
        nextWeek.push(sub);
      } else {
        restOfMonth.push(sub);
      }
    });

    return { thisWeek, nextWeek, restOfMonth };
  }, [processedSubscriptions]);

  // 3. Calculate metrics for the header cards
  const metrics = useMemo(() => {
    let sevenDayTotal = 0;
    let thirtyDayTotal = 0;

    processedSubscriptions.forEach((sub) => {
      // Sum the actual payment amount due for this specific renewal, converted to preferred currency
      const convertedPrice = convertCurrency(sub.price, sub.currency || 'USD', preferredCurrency);
      if (sub.daysLeft <= 7) {
        sevenDayTotal += convertedPrice;
      }
      thirtyDayTotal += convertedPrice;
    });

    return { sevenDayTotal, thirtyDayTotal };
  }, [processedSubscriptions, preferredCurrency]);

  const renderTimelineSection = (
    title: string,
    list: typeof processedSubscriptions
  ) => {
    return (
      <View className="mb-6">
        <Text className="text-sm font-sans-bold text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </Text>
        {list.length === 0 ? (
          <View className="bg-card border border-border rounded-2xl p-4 items-center justify-center">
            <Text className="text-xs font-sans-medium text-muted-foreground opacity-60 text-center">
              {t('upcomingModal.noPayments', { defaultValue: 'No payments due in this period' })}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {list.map((item) => {
              const daysLeftText = item.daysLeft === 0
                ? t('home.lastDay', { defaultValue: 'Last Day' })
                : t('home.daysLeft', { count: item.daysLeft, defaultValue: `${item.daysLeft} days left` });

              return (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between bg-card border border-border rounded-2xl p-4"
                >
                  {/* Left Side: Icon & Details */}
                  <View className="flex-row items-center flex-1 min-w-0 mr-3">
                    <View className="size-12 rounded-xl bg-background border border-border items-center justify-center p-2 mr-3">
                      <Image
                        source={item.icon}
                        className="w-full h-full rounded-lg"
                        resizeMode="contain"
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-base font-sans-bold text-primary" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-xs font-sans-semibold text-muted-foreground mt-0.5">
                        {item.billing} • {daysLeftText}
                      </Text>
                    </View>
                  </View>

                  {/* Right Side: Price */}
                  <View className="flex-row items-center">
                    <Text className="text-base font-sans-bold text-primary">
                      {formatCurrency(item.price, item.currency || 'USD')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="modal-overlay justify-end">
        {/* Backdrop touch to dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View className="modal-container h-[85%]">
          {/* Header */}
          <View className="modal-header">
            <Text className="modal-title">
              {t('upcomingModal.title', { defaultValue: 'Upcoming Payments' })}
            </Text>
            <Pressable className="modal-close" onPress={onClose}>
              <Text className="modal-close-text">✕</Text>
            </Pressable>
          </View>

          <ScrollView 
            contentContainerClassName="p-5 pb-16"
            showsVerticalScrollIndicator={false}
          >
            {/* Cash-Flow Metrics Header */}
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1 bg-accent/10 border border-accent/20 rounded-2xl p-4 justify-between min-h-[96] shadow-sm">
                <Text className="text-xs font-sans-semibold text-accent uppercase tracking-wider">
                  {t('upcomingModal.dueSevenDays', { defaultValue: 'Due in 7 Days' })}
                </Text>
                <Text className="text-2xl font-sans-extrabold text-primary mt-2">
                  {formatCurrency(metrics.sevenDayTotal, preferredCurrency)}
                </Text>
              </View>

              <View className="flex-1 bg-primary rounded-2xl p-4 justify-between min-h-[96] shadow-md">
                <Text className="text-xs font-sans-semibold text-white/70 uppercase tracking-wider">
                  {t('upcomingModal.dueThirtyDays', { defaultValue: 'Due in 30 Days' })}
                </Text>
                <Text className="text-2xl font-sans-extrabold text-white mt-2">
                  {formatCurrency(metrics.thirtyDayTotal, preferredCurrency)}
                </Text>
              </View>
            </View>

            {/* Chronological Timelines */}
            {renderTimelineSection(
              t('upcomingModal.thisWeek', { defaultValue: 'This Week' }),
              groupedTimeline.thisWeek
            )}
            {renderTimelineSection(
              t('upcomingModal.nextWeek', { defaultValue: 'Next Week' }),
              groupedTimeline.nextWeek
            )}
            {renderTimelineSection(
              t('upcomingModal.restOfMonth', { defaultValue: 'Rest of the Month' }),
              groupedTimeline.restOfMonth
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
