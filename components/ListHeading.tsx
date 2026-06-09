import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'

const ListHeading = ({ title, onPress }: ListHeadingProps) => {
  const { t } = useTranslation();

  return (
    <View className='list-head'>
      <Text className='list-title'>{title}</Text>
      {onPress && (
        <TouchableOpacity className='list-action' onPress={onPress}>
          <Text className='list-action-text'>
            {t('common.viewAll', { defaultValue: 'View All' })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default ListHeading