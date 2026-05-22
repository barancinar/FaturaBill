import { formatCurrency } from '@/lib/utils'
import React from 'react'
import { Image, Text, View } from 'react-native'

const UpcomingSubscriptionCard = ({name, price, daysLeft, icon, currency}: UpcomingSubscription) => {
  return (
    <View className='upcoming-card'>
        <View className="upcoming-row">
            <Image source={icon} className="upcoming-icon" />
            <View>
                <Text className='upcoming-price'>{formatCurrency(price, currency)}</Text>
                <Text className='upcoming-meta'>{daysLeft > 1 ? `${daysLeft} days left` : 'Last Day'}</Text>
            </View>
           
        </View>

        <Text className="upcoming-name">{name}</Text>
      
    </View>
  )
}

export default UpcomingSubscriptionCard