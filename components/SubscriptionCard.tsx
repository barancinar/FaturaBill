import { formatCurrency, formatSubscriptionDateTime } from '@/lib/utils'
import clsx from 'clsx'
import React from 'react'
import { Image, Pressable, Text, View, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptions'
import { icons } from '@/constants/icons'
import BrandLogo from './BrandLogo'

const SubscriptionCard = ({id, name, price, currency, icon, billing, color, category, plan, renewalDate, expanded, onPress, paymentMethod, startDate, status}: SubscriptionCardProps) => {
  const router = useRouter();
  const { t } = useTranslation();

  const getCategoryLabel = (cat?: string) => {
    const trimmed = cat?.trim();
    if (trimmed && SUBSCRIPTION_CATEGORIES.includes(trimmed)) {
      return t(`categories.${trimmed}`, { defaultValue: trimmed });
    }
    return trimmed || undefined;
  };

  const getStatusLabel = (statusVal?: string) => {
    switch (statusVal) {
      case 'active':
        return t('common.active', { defaultValue: 'Active' });
      case 'paused':
        return t('common.paused', { defaultValue: 'Paused' });
      case 'cancelled':
        return t('common.cancelled', { defaultValue: 'Cancelled' });
      default:
        return t('card.na', { defaultValue: 'N/A' });
    }
  };

  // Centralized translations are loaded from lib/i18n

  return (
    <Pressable onPress={onPress} className={clsx('sub-card', expanded ? 'sub-card-expanded' : 'bg-card')} style={!expanded && color ? {backgroundColor:color}:undefined}>
      <View className='sub-head'>
        <View className="sub-main">
            <BrandLogo icon={icon} name={name} color={color} size={64} />
            <View className="sub-copy">
                <Text numberOfLines={1} className="sub-title">{name}</Text>
                <Text numberOfLines={1} ellipsizeMode='tail' className='sub-meta'>
                    {getCategoryLabel(category) || (plan?.trim() ? t(`plans.${plan.trim()}`, { defaultValue: plan.trim() }) : undefined) || (renewalDate ? formatSubscriptionDateTime(renewalDate): '')}
                </Text>
            </View>
        </View>
        <View className="sub-price-box">
            <Text className="sub-price">{formatCurrency(price, currency)}</Text>
            <Text className="sub-billing">
              {billing === "Monthly" ? t('common.monthly', { defaultValue: 'Monthly' }) : t('common.yearly', { defaultValue: 'Yearly' })}
            </Text>
        </View>
      </View>
 
        {expanded && (
            <View className="sub-bdy">
                <View className="sub-details">
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">{t('card.payment', { defaultValue: 'Payment:' })}</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>
                              {paymentMethod?.trim() ?? t('card.notProvided', { defaultValue: 'Not Provided' })}
                            </Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">{t('card.category', { defaultValue: 'Category:' })}</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>
                              {getCategoryLabel(category) || (plan?.trim() ? t(`plans.${plan.trim()}`, { defaultValue: plan.trim() }) : undefined) || t('card.na', { defaultValue: 'N/A' })}
                            </Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">{t('card.started', { defaultValue: 'Started:' })}</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>
                              {startDate ? formatSubscriptionDateTime(startDate) : t('card.na', { defaultValue: 'N/A' })}
                            </Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">{t('card.renewalDate', { defaultValue: 'Renewal date:' })}</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>
                              {renewalDate ? formatSubscriptionDateTime(renewalDate) : t('card.na', { defaultValue: 'N/A' })}
                            </Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">{t('card.status', { defaultValue: 'Status:' })}</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>
                              {getStatusLabel(status)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* View Details Button to detailed screen */}
                <TouchableOpacity 
                    onPress={() => router.push(`/subscriptions/${id}`)}
                    className="mt-4 bg-primary/10 border border-primary/20 rounded-xl py-3.5 items-center justify-center flex-row gap-2"
                >
                    <Text className="text-base font-sans-bold text-primary">
                      {t('card.viewDetails', 'View Details')}
                    </Text>
                    <Feather name="arrow-right" size={14} color="#081126" />
                </TouchableOpacity>
            </View>
        )}

    </Pressable>
  )
}

export default SubscriptionCard