import { formatCurrency } from '@/lib/utils'
import React from 'react'
import { Image, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

const UpcomingSubscriptionCard = ({name, price, daysLeft, icon, currency}: UpcomingSubscription) => {
  const { t } = useTranslation();

  const getDaysLeftText = () => {
    if (daysLeft <= 0) {
      return t('home.lastDay', { defaultValue: 'Last Day' });
    }
    return t('home.daysLeft', { count: daysLeft, defaultValue: `${daysLeft} days left` });
  };

  return (
    <View className='upcoming-card'>
        <View className="upcoming-row">
            <Image source={icon} className="upcoming-icon" style={{ width: 56, height: 56 }} />
            <View className="flex-1 min-w-0">
                <Text className='upcoming-price' numberOfLines={1} ellipsizeMode="tail">{formatCurrency(price, currency)}</Text>
                <Text className='upcoming-meta' numberOfLines={1} ellipsizeMode="tail">{getDaysLeftText()}</Text>
            </View>
           
        </View>

        <Text className="upcoming-name" numberOfLines={1} ellipsizeMode="tail">{name}</Text>
      
    </View>
  )
}

export default UpcomingSubscriptionCard
