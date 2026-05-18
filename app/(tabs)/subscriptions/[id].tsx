import { Link, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

const SubscriptionDetails = () => {
    const {id} = useLocalSearchParams<{id: string}>();
  return (
    <View>
      <Text>SubscriptionDetails: {id}</Text>
      <Link href="/" className="mt-4 px-4 py-2 bg-primary rounded">
        <Text className="text-white">Back to Subscriptions</Text>
      </Link>
    </View>
  )
}

export default SubscriptionDetails