import { Feather } from "@expo/vector-icons";
import dayjs from 'dayjs';
import { styled } from "nativewind";
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptions';
import { colors } from '@/constants/theme';
import "@/global.css";
import { useSubscriptions } from "@/lib/store";
import { formatCurrency } from '@/lib/utils';
import clsx from 'clsx';

const SafeAreaView = styled(RNSafeAreaView);



// Centralized translations are loaded from lib/i18n locale files

// Category colors mapping for visual bars and charts
const CATEGORY_COLORS: Record<string, string> = {
  "Entertainment": "#ea7a53",     // orange-accent
  "AI Tools": "#3b82f6",          // blue
  "Developer Tools": "#8b5cf6",   // purple
  "Design": "#f59e0b",            // amber
  "Productivity": "#10b981",      // emerald
  "Cloud": "#06b6d4",             // cyan
  "Music": "#ec4899",             // pink
  "Other": "#6b7280"              // gray
};

// Mock exchange rates
const EXCHANGE_RATES: Record<string, number> = {
  "TRY": 1.0,
  "USD": 32.5,
  "EUR": 35.0
};

// Converted currency helper
const convertCurrency = (amount: number, from: string = 'USD', to: string = 'TRY'): number => {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();
  
  const rateFrom = EXCHANGE_RATES[fromUpper] || EXCHANGE_RATES['USD'];
  const rateTo = EXCHANGE_RATES[toUpper] || EXCHANGE_RATES['TRY'];
  
  const amountInTry = amount * rateFrom;
  return amountInTry / rateTo;
};

// Helper to normalize and convert subscription price based on billing period and preferred currency
const normalizeSubscriptionPrice = (
  sub: Subscription | null,
  period: 'Monthly' | 'Yearly',
  preferredCurrency: string
): number => {
  if (!sub) return 0;
  const subCurrency = sub.currency || 'USD';
  const priceInPreferred = convertCurrency(sub.price, subCurrency, preferredCurrency);
  const isYearly = sub.billing?.toLowerCase() === 'yearly';
  
  if (period === 'Monthly') {
    return isYearly ? priceInPreferred / 12 : priceInPreferred;
  } else {
    return isYearly ? priceInPreferred : priceInPreferred * 12;
  }
};

const Insights = () => {
  const { t } = useTranslation();
  const subscriptions = useSubscriptions();
  const [period, setPeriod] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [preferredCurrency, setPreferredCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');

  // Calculations are processed reactively on store state changes

  // Calculate analytics
  const stats = useMemo(() => {
    let totalSpendMonthly = 0;
    let totalSpendYearly = 0;
    let activeCount = 0;
    let pausedCount = 0;
    let highestSub: Subscription | null = null;
    let highestSubPriceMonthly = 0;

    // Filter out cancelled subscriptions for active metrics
    const activeOrPausedSubs = subscriptions.filter(sub => sub.status !== 'cancelled');

    for (const sub of activeOrPausedSubs) {
      if (sub.status === 'active') {
        activeCount++;
      } else if (sub.status === 'paused') {
        pausedCount++;
      }

      const subCurrency = sub.currency || 'USD';
      const priceInPreferred = convertCurrency(sub.price, subCurrency, preferredCurrency);
      
      const isYearly = sub.billing?.toLowerCase() === 'yearly';
      const monthlyPrice = isYearly ? priceInPreferred / 12 : priceInPreferred;
      const yearlyPrice = isYearly ? priceInPreferred : priceInPreferred * 12;

      totalSpendMonthly += monthlyPrice;
      totalSpendYearly += yearlyPrice;

      if (monthlyPrice > highestSubPriceMonthly) {
        highestSubPriceMonthly = monthlyPrice;
        highestSub = sub;
      }
    }

    const totalSpend = period === 'Monthly' ? totalSpendMonthly : totalSpendYearly;
    const count = activeOrPausedSubs.length;
    const averageBill = count > 0 ? totalSpend / count : 0;

    // Category breakdown
    const categoryDataMap: Record<string, { total: number; count: number }> = {};
    SUBSCRIPTION_CATEGORIES.forEach(cat => {
      categoryDataMap[cat] = { total: 0, count: 0 };
    });

    for (const sub of activeOrPausedSubs) {
      const cat = sub.category || 'Other';
      if (!categoryDataMap[cat]) {
        categoryDataMap[cat] = { total: 0, count: 0 };
      }
      
      const subCurrency = sub.currency || 'USD';
      const priceInPreferred = convertCurrency(sub.price, subCurrency, preferredCurrency);
      
      const isYearly = sub.billing?.toLowerCase() === 'yearly';
      const priceForPeriod = period === 'Monthly' 
        ? (isYearly ? priceInPreferred / 12 : priceInPreferred)
        : (isYearly ? priceInPreferred : priceInPreferred * 12);
      
      categoryDataMap[cat].total += priceForPeriod;
      categoryDataMap[cat].count += 1;
    }

    const categoryBreakdown = Object.entries(categoryDataMap)
      .map(([name, data]) => {
        const percentage = totalSpend > 0 ? (data.total / totalSpend) * 100 : 0;
        return {
          name,
          total: data.total,
          count: data.count,
          percentage,
          color: CATEGORY_COLORS[name] || '#6b7280'
        };
      })
      .filter(item => item.total > 0) // Only display categories with spend
      .sort((a, b) => b.total - a.total); // Sort by spend descending

    // Smart Insights Recommendations
    const recommendations: { id: string; title: string; desc: string; icon: string; color: string }[] = [];

    // Rule 1: Trial Expirations (Urgent)
    subscriptions.forEach(sub => {
      const isSubTrial = sub.isTrial === true;
      if (isSubTrial && sub.renewalDate && sub.status !== 'cancelled') {
        const daysLeft = sub.renewalDate ? dayjs(sub.renewalDate).diff(dayjs(), 'day') : 999;
        if (daysLeft >= 0 && daysLeft <= 3) {
          recommendations.push({
            id: `trial-exp-${sub.id}`,
            title: t('insights.trialEnding', 'Trial Ending'),
            desc: t('insights.rec.trialExpiration', {
              defaultValue: 'Urgent: Your trial for {{name}} expires in {{days}} day(s). Cancel now to avoid being charged.',
              name: sub.name,
              days: daysLeft
            }),
            icon: 'clock',
            color: '#dc2626' // red
          });
        }
      }
    });

    // Rule 2: Overlapping Tools (Consolidation Alert)
    const activeSubs = subscriptions.filter(sub => sub.status === 'active');
    const categoryGroupMap: Record<string, Subscription[]> = {};
    activeSubs.forEach(sub => {
      const cat = sub.category || 'Other';
      if (!categoryGroupMap[cat]) {
        categoryGroupMap[cat] = [];
      }
      categoryGroupMap[cat].push(sub);
    });

    Object.entries(categoryGroupMap).forEach(([catName, subs]) => {
      if (subs.length > 1) {
        recommendations.push({
          id: `overlapping-${catName}`,
          title: t('insights.consolidationAlert', 'Consolidation Alert'),
          desc: t('insights.rec.overlappingTools', {
            defaultValue: 'You have {{count}} active subscriptions in "{{category}}". Consider consolidating them to save money.',
            category: t(`categories.${catName}`, { defaultValue: catName }),
            count: subs.length
          }),
          icon: 'layers',
          color: CATEGORY_COLORS[catName] || '#6b7280'
        });
      }
    });

    // Rule 3: Highest spend category dominance
    const periodLabel = period === 'Monthly' 
      ? t('insights.rec.periodLabelMonthly', { defaultValue: 'mo' })
      : t('insights.rec.periodLabelYearly', { defaultValue: 'yr' });

    if (categoryBreakdown.length > 0 && categoryBreakdown[0].percentage > 35) {
      recommendations.push({
        id: 'category-dominance',
        title: t('insights.categoryDistribution', 'Category Dominance'),
        desc: t('insights.rec.categoryDominance', {
          defaultValue: '{{category}} is your highest spending category, representing {{percentage}}% of your total budget at {{amount}}/{{period}}.',
          category: t(`categories.${categoryBreakdown[0].name}`, { defaultValue: categoryBreakdown[0].name }),
          percentage: categoryBreakdown[0].percentage.toFixed(1),
          amount: formatCurrency(categoryBreakdown[0].total, preferredCurrency),
          period: periodLabel
        }),
        icon: 'pie-chart',
        color: categoryBreakdown[0].color
      });
    }

    // Rule 4: Savings from paused subscriptions
    const pausedSubs = subscriptions.filter(sub => sub.status === 'paused');
    if (pausedSubs.length > 0) {
      let pausedSavingsMonthly = 0;
      pausedSubs.forEach(sub => {
        const subCurrency = sub.currency || 'USD';
        const priceInPreferred = convertCurrency(sub.price, subCurrency, preferredCurrency);
        const isYearly = sub.billing?.toLowerCase() === 'yearly';
        pausedSavingsMonthly += isYearly ? priceInPreferred / 12 : priceInPreferred;
      });
      const pausedSavings = period === 'Monthly' ? pausedSavingsMonthly : pausedSavingsMonthly * 12;

      recommendations.push({
        id: 'paused-savings',
        title: t('insights.rec.potentialSavingsTitle', 'Potential Savings'),
        desc: t('insights.rec.potentialSavings', {
          defaultValue: 'You have {{count}} paused subscription(s). Deleting or cancelling them completely could save you up to {{amount}}/{{period}}.',
          count: pausedSubs.length,
          amount: formatCurrency(pausedSavings, preferredCurrency),
          period: periodLabel
        }),
        icon: 'trending-down',
        color: '#ea7a53' // accent red/orange
      });
    }

    // Rule 5: High cost alert
    if (highestSub) {
      const subCurrency = highestSub.currency || 'USD';
      const priceInPreferred = convertCurrency(highestSub.price, subCurrency, preferredCurrency);
      const highestPrice = period === 'Monthly' 
        ? (highestSub.billing?.toLowerCase() === 'yearly' ? priceInPreferred / 12 : priceInPreferred)
        : (highestSub.billing?.toLowerCase() === 'yearly' ? priceInPreferred : priceInPreferred * 12);
      
      const isThresholdMet = period === 'Monthly' 
        ? highestPrice > convertCurrency(25, 'USD', preferredCurrency)
        : highestPrice > convertCurrency(300, 'USD', preferredCurrency);

      if (isThresholdMet) {
        recommendations.push({
          id: 'high-cost',
          title: t('insights.rec.highCostTitle', 'High-Cost Alert'),
          desc: t('insights.rec.highCost', {
            defaultValue: '{{name}} is your most expensive subscription, costing {{amount}}/{{period}}. Make sure you still get value from this subscription.',
            name: highestSub.name,
            amount: formatCurrency(highestPrice, preferredCurrency),
            period: periodLabel
          }),
          icon: 'alert-triangle',
          color: '#f59e0b' // amber
        });
      }
    }

    // Fallback recommendation if list is empty
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'general-tip',
        title: t('insights.rec.defaultTipTitle', 'Subscription Tip'),
        desc: t('insights.rec.defaultTip', 'Keep tracking your subscriptions to get smart recommendations and cost-saving opportunities.'),
        icon: 'info',
        color: '#081126'
      });
    }

    // Renewal Timeline: sort active subscriptions by renewal date
    const activeSubsForTimeline = subscriptions
      .filter(sub => sub.status === 'active' && sub.renewalDate)
      .map(sub => {
        const daysLeft = sub.renewalDate ? dayjs(sub.renewalDate).diff(dayjs(), 'day') : 999;
        return {
          ...sub,
          daysLeft: daysLeft < 0 ? 0 : daysLeft
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return {
      totalSpend,
      averageBill,
      highestSub,
      highestSubPrice: normalizeSubscriptionPrice(highestSub, period, preferredCurrency),
      activeCount,
      pausedCount,
      categoryBreakdown,
      recommendations,
      timeline: activeSubsForTimeline
    };
  }, [subscriptions, period, preferredCurrency, t]);

  // Formatted Pie Chart data
  const chartData = useMemo(() => {
    return stats.categoryBreakdown.map((item) => ({
      value: item.total,
      color: item.color,
      text: `${item.percentage.toFixed(0)}%`,
      label: item.name,
    }));
  }, [stats.categoryBreakdown]);

  return (
    <SafeAreaView className="flex-1 bg-background p-5 pt-4">
      {/* Header with Switchers */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-3xl font-sans-bold text-primary">{t('insights.title', 'Insights')}</Text>
        
        <View className="flex-row items-center gap-2">
          {/* Period Selector (Monthly/Yearly) */}
          <View className="flex-row bg-muted rounded-full p-1 border border-border">
            <TouchableOpacity 
              onPress={() => setPeriod('Monthly')} 
              className={clsx("px-4 py-1.5 rounded-full", period === 'Monthly' ? "bg-primary" : "bg-transparent")}
            >
              <Text className={clsx("text-xs font-sans-bold", period === 'Monthly' ? "text-white" : "text-primary")}>
                {t('insights.monthly', 'Monthly')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setPeriod('Yearly')} 
              className={clsx("px-4 py-1.5 rounded-full", period === 'Yearly' ? "bg-primary" : "bg-transparent")}
            >
              <Text className={clsx("text-xs font-sans-bold", period === 'Yearly' ? "text-white" : "text-primary")}>
                {t('insights.yearly', 'Yearly')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Currency Selector */}
      <View className="flex-row items-center mb-5 gap-2">
        <Text className="text-sm font-sans-semibold text-muted-foreground mr-1">
          {t('insights.currencyLabel', 'Currency:')}
        </Text>
        {(['TRY', 'USD', 'EUR'] as const).map((curr) => (
          <TouchableOpacity
            key={curr}
            onPress={() => setPreferredCurrency(curr)}
            className={clsx("px-4 py-2 rounded-xl border", preferredCurrency === curr ? "bg-primary border-primary" : "bg-card border-border")}
          >
            <Text className={clsx("text-sm font-sans-bold", preferredCurrency === curr ? "text-white" : "text-primary")}>
              {curr}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Total Spend Card */}
        <View className="bg-primary rounded-3xl p-6 mb-5 shadow-lg shadow-black/10">
          <Text className="text-white/60 font-sans-semibold text-xs uppercase tracking-wider mb-1">
            {t('insights.projectedSpend', { defaultValue: 'Projected {{period}} Spend', period: period === 'Monthly' ? t('insights.monthly') : t('insights.yearly') })}
          </Text>
          <Text className="text-4xl font-sans-extrabold text-white mb-4">
            {formatCurrency(stats.totalSpend, preferredCurrency)}
          </Text>
          <View className="h-px bg-white/10 my-1" />
          <View className="flex-row justify-between items-center mt-3">
            <View className="flex-row items-center gap-1.5">
              <Feather name="trending-up" size={14} color="#8fd1bd" />
              <Text className="text-xs font-sans-medium text-white/80">
                {t('insights.basedOnActive', { defaultValue: 'Based on {{count}} active subscriptions', count: stats.activeCount })}
              </Text>
            </View>
            {stats.pausedCount > 0 && (
              <Text className="text-xs font-sans-bold bg-accent/25 text-accent border border-accent/25 rounded-full px-2.5 py-0.5">
                {t('insights.pausedCount', { defaultValue: '{{count}} Paused', count: stats.pausedCount })}
              </Text>
            )}
          </View>
        </View>

        {/* Metrics Grid */}
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-card border border-border rounded-2xl p-5 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-sans-bold text-muted-foreground uppercase tracking-wider">
                {t('insights.averageBill', 'Average Bill')}
              </Text>
              <Text className="text-xl font-sans-extrabold text-primary mt-1">
                {formatCurrency(stats.averageBill, preferredCurrency)}
              </Text>
              <Text className="text-xs font-sans-medium text-muted-foreground mt-0.5">
                {t('insights.perSubscription', 'per subscription')}
              </Text>
            </View>
            <View className="size-12 bg-muted rounded-full items-center justify-center shrink-0">
              <Feather name="credit-card" size={20} color="#081126" />
            </View>
          </View>
          
          <View className="flex-1 bg-card border border-border rounded-2xl p-5 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-sans-bold text-muted-foreground uppercase tracking-wider">
                {t('insights.mostExpensive', 'Most Expensive')}
              </Text>
              <Text className="text-xl font-sans-extrabold text-primary mt-1" numberOfLines={1}>
                {stats.highestSub ? formatCurrency(stats.highestSubPrice, preferredCurrency) : formatCurrency(0, preferredCurrency)}
              </Text>
              <Text className="text-xs font-sans-medium text-muted-foreground mt-0.5" numberOfLines={1}>
                {stats.highestSub ? stats.highestSub.name : t('insights.noSubscription', 'None')}
              </Text>
            </View>
            <View className="size-12 bg-muted rounded-full items-center justify-center shrink-0">
              <Feather name="trending-up" size={20} color="#ea7a53" />
            </View>
          </View>
        </View>

        {/* Donut Chart from Gifted Charts */}
        {chartData.length > 0 && (
          <View className="bg-card border border-border rounded-3xl p-5 mb-6">
            <Text className="text-base font-sans-bold text-primary mb-4">
              {t('insights.categoryDistribution', 'Category Distribution')}
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="items-center justify-center">
                <PieChart
                  donut
                  radius={72}
                  innerRadius={36}
                  data={chartData}
                  showText
                  textColor="#081126"
                  textSize={9}
                  showTextBackground
                  textBackgroundColor="white"
                  textBackgroundRadius={10}
                  animationDuration={800}
                  innerCircleColor={colors.card}
                />
              </View>
              {/* Legend List */}
              <View className="flex-1 ml-5 gap-2">
                {stats.categoryBreakdown.slice(0, 4).map((item) => (
                  <View key={item.name} className="flex-row items-center gap-2">
                    <View className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-sans-semibold text-primary" numberOfLines={1}>
                        {t(`categories.${item.name}`, { defaultValue: item.name })}
                      </Text>
                      <Text className="text-xs font-sans-medium text-muted-foreground">
                        {item.percentage.toFixed(1)}% ({formatCurrency(item.total, preferredCurrency)})
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Category List Details (Fallback / Standard layout) */}
        <View className="bg-card border border-border rounded-3xl p-5 mb-6">
          <Text className="text-lg font-sans-bold text-primary mb-4">
            {t('insights.categoryBreakdown', 'Category Breakdown')}
          </Text>
          {stats.categoryBreakdown.length === 0 ? (
            <Text className="text-sm font-sans-medium text-muted-foreground text-center py-4">
              {t('insights.rec.defaultTip', 'No active subscriptions to analyze.')}
            </Text>
          ) : (
            <View className="gap-4">
              {stats.categoryBreakdown.map((item) => (
                <View key={item.name} className="gap-2">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <View className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <Text className="text-base font-sans-semibold text-primary">
                        {t(`categories.${item.name}`, { defaultValue: item.name })}
                      </Text>
                      <Text className="text-sm font-sans-medium text-muted-foreground">
                        ({item.count} {item.count > 1 ? t('common.sub_other', { defaultValue: 'subs' }) : t('common.sub_one', { defaultValue: 'sub' })})
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-sans-bold text-primary">
                        {formatCurrency(item.total, preferredCurrency)}
                      </Text>
                      <Text className="text-xs font-sans-medium text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  {/* Progress Bar */}
                  <View className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Smart Cost-Saving Insights */}
        <View className="bg-card border border-border rounded-3xl p-5 mb-6">
          <Text className="text-lg font-sans-bold text-primary mb-4">
            {t('insights.smartInsights', 'Smart Insights')}
          </Text>
          <View className="gap-4">
            {stats.recommendations.map((rec) => (
              <View key={rec.id} className="flex-row gap-3 bg-background border border-border/40 rounded-2xl p-5">
                <View
                  className="size-12 rounded-full items-center justify-center shrink-0"
                  style={{ backgroundColor: rec.color + '15' }}
                >
                  <Feather name={rec.icon as any} size={20} color={rec.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-sans-bold text-primary">{rec.title}</Text>
                  <Text className="text-sm font-sans-medium text-muted-foreground mt-1 leading-relaxed">
                    {rec.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming Renewals Timeline */}
        <View className="bg-card border border-border rounded-3xl p-5">
          <Text className="text-lg font-sans-bold text-primary mb-4">
            {t('insights.upcomingRenewals', 'Upcoming Renewals')}
          </Text>
          {stats.timeline.length === 0 ? (
            <Text className="text-sm font-sans-medium text-muted-foreground text-center py-4">
              {t('insights.rec.defaultTip', 'No active renewals found.')}
            </Text>
          ) : (
            <View className="gap-4">
              {stats.timeline.map((item) => (
                <View key={item.id} className="flex-row items-center gap-3">
                  {/* Icon Wrapper */}
                  <View className="size-14 rounded-xl bg-background border border-border/40 items-center justify-center p-2">
                    <Image source={item.icon} className="w-full h-full rounded-lg" resizeMode="contain" />
                  </View>
                  
                  {/* Details */}
                  <View className="flex-1 min-w-0">
                    <Text className="text-base font-sans-bold text-primary" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-sm font-sans-medium text-muted-foreground mt-0.5">
                      {item.daysLeft === 0 
                        ? t('insights.renewingToday', 'Renewing today') 
                        : item.daysLeft === 1 
                          ? t('insights.renewingTomorrow', 'Renewing tomorrow') 
                          : t('insights.renewingInDays', { defaultValue: 'Renewing in {{count}} days', count: item.daysLeft })}
                    </Text>
                  </View>

                  {/* Price info */}
                  <View className="items-end">
                    <Text className="text-base font-sans-bold text-primary">
                      {formatCurrency(item.price, item.currency || 'USD')}
                    </Text>
                    <Text className="text-xs font-sans-medium text-muted-foreground">
                      {item.billing}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;