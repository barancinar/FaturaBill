import { formatCurrency, formatStatusLabel, formatSubscriptionDateTime } from '@/lib/utils'
import clsx from 'clsx'
import React from 'react'
import { Image, Pressable, Text, View, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'

const SubscriptionCard = ({id, name, price, currency, icon, billing, color, category, plan, renewalDate, expanded, onPress, paymentMethod, startDate, status}: SubscriptionCardProps) => {
  const router = useRouter();
  const { t } = useTranslation();

  // Load translations dynamically for Card
  React.useEffect(() => {
    if (i18n.isInitialized) {
      i18n.addResourceBundle('en', 'translation', { card: { viewDetails: "View Details" } }, true, true);
      i18n.addResourceBundle('tr', 'translation', { card: { viewDetails: "Detayları Gör" } }, true, true);
    }
  }, []);

  return (
    <Pressable onPress={onPress} className={clsx('sub-card', expanded ? 'sub-card-expanded' : 'bg-card')} style={!expanded && color ? {backgroundColor:color}:undefined}>
      <View className='sub-head'>
        <View className="sub-main">
            <Image source={icon} className="sub-icon" />
            <View className="sub-copy">
                <Text numberOfLines={1} className="sub-title">{name}</Text>
                <Text numberOfLines={1} ellipsizeMode='tail' className='sub-meta'>
                    {category?.trim() || plan?.trim() || (renewalDate ? formatSubscriptionDateTime(renewalDate): '')}
                </Text>
            </View>
        </View>
        <View className="sub-price-box">
            <Text className="sub-price">{formatCurrency(price, currency)}</Text>
            <Text className="sub-billing">{billing}</Text>
        </View>
      </View>

        {expanded && (
            <View className="sub-bdy">
                <View className="sub-details">
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">Payment:</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>{paymentMethod?.trim() ?? 'Not Provided'}</Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">Category:</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>{category?.trim() || plan?.trim() || 'N/A'}</Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">Started:</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>{startDate ? formatSubscriptionDateTime(startDate) : 'N/A'}</Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">Renewal date:</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>{renewalDate ? formatSubscriptionDateTime(renewalDate) : 'N/A'}</Text>
                        </View>
                    </View>
                    <View className="sub-row">
                        <View className="sub-row-copy">
                            <Text className="sub-label">Status:</Text>
                            <Text className="sub-value" numberOfLines={1} ellipsizeMode='tail'>{status ? formatStatusLabel(status) : 'N/A'}</Text>
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