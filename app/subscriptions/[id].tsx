import { Link, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAnalytics } from '@/lib/analytics';

const SubscriptionDetails = () => {
    const {id} = useLocalSearchParams<{id: string}>();
    const { trackSubscriptionDetailsViewed } = useAnalytics();

    useEffect(() => {
        if (id) {
            trackSubscriptionDetailsViewed(id);
        }
    }, [id, trackSubscriptionDetailsViewed]);

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