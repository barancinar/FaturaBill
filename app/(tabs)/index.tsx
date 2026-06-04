import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE, HOME_USER, UPCOMING_SUBSCRIPTIONS } from "@/constants/data";
import { useSubscriptions, addSubscription } from "@/lib/store";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useAnalytics } from "@/lib/analytics";
import { useState, useEffect } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";


const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
    const { user } = useUser();
    const { trackSubscriptionCardExpanded, updateUserProperties } = useAnalytics();
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
    const subscriptions = useSubscriptions();
    const [modalVisible, setModalVisible] = useState(false);

    // Calculate total spend & active count, and update user properties in PostHog
    useEffect(() => {
        let activeCount = 0;
        let totalSpend = 0;
        subscriptions.forEach(sub => {
            if (sub.status === 'active') {
                activeCount++;
            }
            if (sub.status !== 'cancelled') {
                const isYearly = sub.billing?.toLowerCase() === 'yearly';
                const monthlyEquivalent = isYearly ? sub.price / 12 : sub.price;
                totalSpend += monthlyEquivalent;
            }
        });
        updateUserProperties(totalSpend, activeCount);
    }, [subscriptions, updateUserProperties]);

    const emailAddress = user?.emailAddresses?.[0]?.emailAddress;
    const fallbackName = emailAddress ? emailAddress.split('@')[0] : '';
    const displayName = user?.firstName || fallbackName || HOME_USER.name;

    const handleCreateSubscription = (newSub: Subscription) => {
        addSubscription(newSub);
    };

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
                <FlatList
                    ListHeaderComponent={() => (
                        <>
                            <View className="home-header">
                                <View className="home-user">
                                    <Image 
                                        source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar} 
                                        className="home-avatar" 
                                        />
                                    <Text className="home-user-name">
                                        {displayName}
                                    </Text>
                                </View>
                                <Pressable onPress={() => setModalVisible(true)}>
                                    <Image source={icons.add} className="home-add-icon"/>
                                </Pressable>
                            </View>
                            <View className="home-balance-card">
                                <Text className="home-balance-label">Balance</Text>
                                <View className="home-balance-row">
                                    <Text className="home-balance-amount">
                                        {formatCurrency(HOME_BALANCE.amount)}
                                    </Text>
                                    <Text className="home-balance-date">
                                        {dayjs(HOME_BALANCE.nextRenewalDate).format("MM/DD")}
                                    </Text>
                                </View>
                            </View>

                             <View className="mb-5">
                                 <ListHeading title="Upcoming"/>
                                 <FlatList
                                     data={UPCOMING_SUBSCRIPTIONS}
                                     renderItem={({ item }) => <UpcomingSubscriptionCard {...item} />}
                                     keyExtractor={(item) => item.id }
                                     horizontal
                                     showsHorizontalScrollIndicator={false}
                                     ListEmptyComponent={<Text className="home-empty-state">No upcoming renewals yet.</Text>}
                                 />
                             </View>
                            <ListHeading title="All Subscriptions"/>
            
                        </>
                    )}
                    data={subscriptions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <SubscriptionCard
                            {...item}
                            expanded={expandedSubscriptionId === item.id}
                            onPress={() => {
                                const isExpanding = expandedSubscriptionId !== item.id;
                                if (isExpanding) {
                                    trackSubscriptionCardExpanded(item.id, item.name, item.price, item.currency ?? "USD");
                                }
                                setExpandedSubscriptionId((currentId) => (currentId === item.id ? null : item.id));
                            }}
                        />
                    )}
                    extraData={expandedSubscriptionId}
                    ItemSeparatorComponent={() => <View className="h-4" />}
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="pb-30"
                    ListEmptyComponent={<Text className="home-empty-state">No subscriptions found. Add your first subscription to get started!</Text>}
                />

                <CreateSubscriptionModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onCreate={handleCreateSubscription}
                />
        </SafeAreaView>
    );
}