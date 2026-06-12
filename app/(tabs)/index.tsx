import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import UpcomingPaymentsModal from "@/components/UpcomingPaymentsModal";
import { HOME_USER } from "@/constants/data";
import { useSubscriptions, addSubscription } from "@/lib/store";
import { useMonthlyBudget, setMonthlyBudget, usePreferredCurrency, useIsCacheLoaded, useIsNetworkLoaded } from "@/lib/settingsStore";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { formatCurrency } from "@/lib/utils";
import { convertCurrency } from "@/lib/currency";
import { useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useAnalytics } from "@/lib/analytics";
import { useState, useEffect, useMemo } from "react";
import { FlatList, Image, Pressable, Text, View, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { useRouter } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
    const { t } = useTranslation();
    const { user } = useUser();
    const { trackSubscriptionCardExpanded, updateUserProperties } = useAnalytics();
    const preferredCurrency = usePreferredCurrency();
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
    const subscriptions = useSubscriptions();
    const budget = useMonthlyBudget();
    const isCacheLoaded = useIsCacheLoaded();
    const isNetworkLoaded = useIsNetworkLoaded();
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [budgetModalVisible, setBudgetModalVisible] = useState(false);
    const [upcomingPaymentsModalVisible, setUpcomingPaymentsModalVisible] = useState(false);
    const [tempBudget, setTempBudget] = useState(budget !== null ? budget.toString() : '');

    // Synchronize inputs when budget settings load asynchronously
    useEffect(() => {
        setTempBudget(budget !== null ? budget.toString() : '');
    }, [budget]);

    // Calculate monthly equivalent total spend of active subscriptions
    const totalActiveSpend = useMemo(() => {
        return subscriptions
            .filter(sub => sub.status === 'active')
            .reduce((sum, sub) => {
                const isYearly = sub.billing?.toLowerCase() === 'yearly';
                const monthlyEquivalent = isYearly ? sub.price / 12 : sub.price;
                const converted = convertCurrency(monthlyEquivalent, sub.currency || 'USD', preferredCurrency);
                return sum + converted;
            }, 0);
    }, [subscriptions, preferredCurrency]);

    // Calculate budget progress values
    const progressPercent = useMemo(() => {
        if (budget === null || budget <= 0) return 0;
        return Math.min((totalActiveSpend / budget) * 100, 100);
    }, [totalActiveSpend, budget]);

    const displayPercent = useMemo(() => {
        if (budget === null || budget <= 0) return 0;
        return Math.round((totalActiveSpend / budget) * 100);
    }, [totalActiveSpend, budget]);

    // Calculate live active subscriptions whose renewal is within next 30 days
    const upcomingSubscriptions = useMemo(() => {
        return subscriptions
            .filter(sub => sub.status === 'active' && sub.renewalDate)
            .map(sub => {
                const daysLeft = sub.renewalDate ? dayjs(sub.renewalDate).diff(dayjs(), 'day') : 999;
                return {
                    id: sub.id,
                    icon: sub.icon,
                    name: sub.name,
                    price: sub.price,
                    currency: sub.currency || 'USD',
                    daysLeft: daysLeft,
                    color: sub.color
                };
            })
            .filter(sub => sub.daysLeft >= 0 && sub.daysLeft <= 30)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [subscriptions]);

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
                const converted = convertCurrency(monthlyEquivalent, sub.currency || 'USD', preferredCurrency);
                totalSpend += converted;
            }
        });
        updateUserProperties(totalSpend, activeCount);
    }, [subscriptions, updateUserProperties, preferredCurrency]);

    const emailAddress = user?.emailAddresses?.[0]?.emailAddress;
    const fallbackName = emailAddress ? emailAddress.split('@')[0] : '';
    const displayName = user?.firstName || fallbackName || HOME_USER.name;

    const handleCreateSubscription = (newSub: Subscription) => {
        addSubscription(newSub);
    };

    const handleSaveBudget = async () => {
        if (tempBudget.trim() === '') {
            await setMonthlyBudget(null);
            setBudgetModalVisible(false);
            return;
        }
        const parsed = parseFloat(tempBudget);
        if (!isNaN(parsed) && parsed >= 0) {
            await setMonthlyBudget(parsed);
            setBudgetModalVisible(false);
        }
    };

    const isValidBudget = tempBudget.trim() === '' || (!isNaN(parseFloat(tempBudget)) && parseFloat(tempBudget) >= 0);

    const headerComponent = (
        <>
            <View className="home-header">
                <View className="home-user">
                    <Image 
                        source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar} 
                        className="home-avatar" 
                        style={{ width: 64, height: 64, borderRadius: 32 }}
                        />
                    <Text className="home-user-name">
                        {displayName}
                    </Text>
                </View>
                <Pressable onPress={() => setModalVisible(true)}>
                    <Image source={icons.add} className="home-add-icon" style={{ width: 40, height: 40 }}/>
                </Pressable>
            </View>
            
            {/* Personalized Budget Progress Card */}
            {!isCacheLoaded || (budget === null && !isNetworkLoaded) ? (
                <View className="my-2.5 min-h-36 justify-center items-center rounded-bl-4xl rounded-tr-4xl bg-card border border-border p-6 shadow-sm opacity-65">
                    <View className="w-10 h-10 rounded-full bg-primary/10 mb-3 animate-pulse" />
                    <View className="w-1/2 h-5 rounded bg-primary/10 mb-2 animate-pulse" />
                    <View className="w-1/3 h-4 rounded bg-primary/10 animate-pulse" />
                </View>
            ) : budget === null ? (
                <Pressable 
                    onPress={() => {
                        setTempBudget('');
                        setBudgetModalVisible(true);
                    }}
                    className="my-2.5 min-h-36 justify-center items-center gap-2 rounded-bl-4xl rounded-tr-4xl bg-card border-2 border-dashed border-accent/20 p-6 shadow-sm"
                >
                    <Image source={icons.setting} className="size-8 opacity-60" style={{ width: 32, height: 32 }} />
                    <Text className="text-lg font-sans-bold text-primary/80 text-center">
                        {t("home.noBudgetSet", { defaultValue: "No budget set yet" })}
                    </Text>
                    <Text className="text-xs font-sans-semibold text-accent text-center mt-1">
                        {t("home.tapToSetBudget", { defaultValue: "Tap here to set your monthly limit" })}
                    </Text>
                </Pressable>
            ) : (
                <Pressable 
                    onPress={() => {
                        setTempBudget(budget.toString());
                        setBudgetModalVisible(true);
                    }}
                    className="my-2.5 min-h-50 justify-between gap-4 rounded-bl-4xl rounded-tr-4xl bg-primary p-6 border border-white/10 shadow-lg shadow-black/20"
                >
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-sans-bold text-white/70">
                            {t("home.budgetProgress", { defaultValue: "Budget Progress" })}
                        </Text>
                        <Text className="text-sm font-sans-medium text-white/60">
                            {t("home.budgetLimitText", { spend: formatCurrency(totalActiveSpend, preferredCurrency), limit: formatCurrency(budget, preferredCurrency), defaultValue: `${formatCurrency(totalActiveSpend, preferredCurrency)} of ${formatCurrency(budget, preferredCurrency)}` })}
                        </Text>
                    </View>

                    <View className="my-1">
                        <View className="flex-row justify-between items-baseline mb-2">
                            <Text className="text-3xl font-sans-extrabold text-white">
                                {formatCurrency(totalActiveSpend, preferredCurrency)}
                            </Text>
                            <Text className={clsx("text-sm font-sans-bold", displayPercent > 90 ? "text-destructive" : displayPercent > 70 ? "text-accent" : "text-subscription")}>
                                {t("home.budgetSpendPercentage", { percent: displayPercent, defaultValue: `${displayPercent}% of budget used` })}
                            </Text>
                        </View>

                        {/* Sleek Progress Bar */}
                        <View className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                            <View 
                                className={clsx("h-full rounded-full", 
                                    displayPercent > 90 ? "bg-destructive" : displayPercent > 70 ? "bg-accent" : "bg-subscription"
                                )}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </View>
                    </View>

                    {/* Sub-label / status info */}
                    <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-xs font-sans-medium text-white/50">
                            {t("home.budgetLimit", { defaultValue: "Monthly Budget Limit" })}: {formatCurrency(budget, preferredCurrency)}
                        </Text>
                        {totalActiveSpend > budget && (
                            <Text className="text-xs font-sans-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2.5 py-0.5 animate-pulse">
                                {t("home.budgetOverspent", { amount: formatCurrency(totalActiveSpend - budget, preferredCurrency), defaultValue: `Overspent by ${formatCurrency(totalActiveSpend - budget, preferredCurrency)}!` })}
                            </Text>
                        )}
                    </View>
                </Pressable>
            )}

             <View className="mb-5">
                 <ListHeading 
                     title={t("home.upcoming", { defaultValue: "Upcoming" })}
                     onPress={() => setUpcomingPaymentsModalVisible(true)}
                 />
                 <FlatList
                     data={upcomingSubscriptions}
                     renderItem={({ item }) => <UpcomingSubscriptionCard {...item} />}
                     keyExtractor={(item) => item.id }
                     horizontal
                     showsHorizontalScrollIndicator={false}
                     ListEmptyComponent={<Text className="home-empty-state">{t("home.noUpcoming", { defaultValue: "No upcoming renewals yet." })}</Text>}
                 />
             </View>
             <ListHeading 
                 title={t("home.allSubscriptions", { defaultValue: "All Subscriptions" })}
                 onPress={() => router.push('/subscriptions')}
             />

        </>
    );

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
                <FlatList
                    ListHeaderComponent={headerComponent}
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
                    ListEmptyComponent={<Text className="home-empty-state">{t("home.noSubscriptions", { defaultValue: "No subscriptions found. Add your first subscription to get started!" })}</Text>}
                />

                <CreateSubscriptionModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onCreate={handleCreateSubscription}
                />

                {/* Monthly Budget Edit Modal */}
                <Modal
                    visible={budgetModalVisible}
                    transparent
                    animationType="slide"
                    statusBarTranslucent
                    onRequestClose={() => setBudgetModalVisible(false)}
                >
                    <View className="modal-overlay justify-end">
                        {/* Backdrop touch to dismiss */}
                        <Pressable 
                            style={StyleSheet.absoluteFill} 
                            onPress={() => setBudgetModalVisible(false)} 
                        />
                        
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            className="modal-container"
                        >
                            <View className="modal-header">
                                <Text className="modal-title">
                                    {t("settings.editBudgetTitle", { defaultValue: "Edit Monthly Budget" })}
                                </Text>
                                <Pressable className="modal-close" onPress={() => setBudgetModalVisible(false)}>
                                    <Text className="modal-close-text">✕</Text>
                                </Pressable>
                            </View>
                            
                            <ScrollView 
                                contentContainerClassName="modal-body pb-10" 
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Budget input */}
                                <View className="auth-field">
                                    <Text className="auth-label">
                                        {t("settings.monthlyBudget", { defaultValue: "Monthly Budget" })}
                                    </Text>
                                    <View className="relative justify-center">
                                        <Text className="absolute left-4 z-10 text-base font-sans-bold text-primary/40">
                                            {preferredCurrency === 'TRY' ? '₺' : preferredCurrency === 'EUR' ? '€' : '$'}
                                        </Text>
                                        <TextInput
                                            className="auth-input pl-10"
                                            placeholder="0.00"
                                            placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                            keyboardType="decimal-pad"
                                            value={tempBudget}
                                            onChangeText={setTempBudget}
                                            autoFocus
                                        />
                                    </View>
                                    <Text className="text-xs font-sans-medium text-muted-foreground/60 mt-1 pl-1">
                                        {t("settings.budgetCurrencyNote", { currency: preferredCurrency, defaultValue: `Budget is managed in your global preferred currency (${preferredCurrency}).` })}
                                    </Text>
                                </View>

                                {/* Submit button */}
                                <Pressable
                                    className={clsx("auth-button", !isValidBudget && "auth-button-disabled")}
                                    disabled={!isValidBudget}
                                    onPress={handleSaveBudget}
                                >
                                    <Text className="auth-button-text">
                                        {t("settings.save", { defaultValue: "Save" })}
                                    </Text>
                                </Pressable>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* Detailed Upcoming Payments Timeline bottom-sheet modal */}
                <UpcomingPaymentsModal 
                    visible={upcomingPaymentsModalVisible}
                    onClose={() => setUpcomingPaymentsModalVisible(false)}
                />
        </SafeAreaView>
    );
}