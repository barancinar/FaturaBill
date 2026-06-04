import React, { useState, useMemo } from 'react';

import { 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ScrollView 
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useAnalytics } from "@/lib/analytics";
import { Feather } from "@expo/vector-icons";

import SubscriptionCard from "@/components/SubscriptionCard";
import { formatCurrency } from "@/lib/utils";
import { useSubscriptions } from "@/lib/store";
import { SUBSCRIPTION_CATEGORIES } from "@/constants/subscriptions";
import "@/global.css";

const SafeAreaView = styled(RNSafeAreaView);

const FILTER_OPTIONS = ["All", ...SUBSCRIPTION_CATEGORIES];

const Subscriptions = () => {
  const { trackSearchPerformed, trackFilterChanged, trackSubscriptionCardExpanded } = useAnalytics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
  const subscriptions = useSubscriptions();


  // Calculate statistics based on current active/paused status
  const { totalMonthly, activeCount, pausedCount } = useMemo(() => {
    let active = 0;
    let paused = 0;
    let monthlySpend = 0;

    subscriptions.forEach((sub) => {
      if (sub.status === "active") {
        active++;
      } else if (sub.status === "paused") {
        paused++;
      }

      // We only sum costs of non-cancelled subscriptions
      if (sub.status !== "cancelled") {
        const isYearly = sub.billing.toLowerCase() === "yearly";
        const monthlyEquivalent = isYearly ? sub.price / 12 : sub.price;
        monthlySpend += monthlyEquivalent;
      }
    });

    return {
      totalMonthly: monthlySpend,
      activeCount: active,
      pausedCount: paused,
    };
  }, [subscriptions]);

  // Filter subscriptions based on search query and selected chip
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // 1. Search Query filter
      const matchesSearch = 
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.category && sub.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.plan && sub.plan.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Filter Chip filter
      if (selectedFilter === "All") return true;
      if (selectedFilter === "Active") return sub.status === "active";
      if (selectedFilter === "Paused") return sub.status === "paused";
      if (selectedFilter === "Cancelled") return sub.status === "cancelled";
      
      // Category filter (Design, AI Tools, Developer Tools)
      return sub.category?.toLowerCase() === selectedFilter.toLowerCase();
    });
  }, [subscriptions, searchQuery, selectedFilter]);

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      {/* Header Title */}
      <View className="mb-4">
        <Text className="text-3xl font-sans-bold text-primary">Subscriptions</Text>
      </View>

      {/* Stats Cards */}
      <View className="flex-row gap-4 mb-5">
        <View className="flex-1 bg-primary rounded-2xl p-4 justify-between min-h-[90]">
          <Text className="text-xs font-sans-semibold text-white/60 uppercase tracking-wider">Monthly Spend</Text>
          <Text className="text-2xl font-sans-extrabold text-white">{formatCurrency(totalMonthly)}</Text>
        </View>
        <View className="flex-row gap-2 flex-1">
          <View className="flex-1 bg-card border border-border rounded-2xl p-3 justify-between items-center">
            <Text className="text-xs font-sans-semibold text-muted-foreground uppercase">Active</Text>
            <Text className="text-xl font-sans-bold text-success">{activeCount}</Text>
          </View>
          <View className="flex-1 bg-card border border-border rounded-2xl p-3 justify-between items-center">
            <Text className="text-xs font-sans-semibold text-muted-foreground uppercase">Paused</Text>
            <Text className="text-xl font-sans-bold text-accent">{pausedCount}</Text>
          </View>
        </View>
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3.5 mb-4">
        <Feather name="search" size={20} color="rgba(0, 0, 0, 0.4)" />
        <TextInput
          className="flex-1 ml-2 text-base font-sans-medium text-primary"
          placeholder="Search subscriptions, categories..."
          placeholderTextColor="rgba(0, 0, 0, 0.4)"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            trackSearchPerformed(text);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Feather name="x" size={20} color="rgba(0, 0, 0, 0.6)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips ScrollView */}
      <View className="mb-4">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                className={`category-chip ${isActive ? "category-chip-active" : ""}`}
                onPress={() => {
                  setSelectedFilter(filter);
                  trackFilterChanged(filter);
                }}
              >
                <Text className={`category-chip-text ${isActive ? "category-chip-text-active" : ""}`}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Subscription List */}
      <FlatList
        data={filteredSubscriptions}
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
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-12 px-4">
            <Feather name="search" size={48} color="rgba(0, 0, 0, 0.2)" className="mb-4" />
            <Text className="text-lg font-sans-bold text-primary text-center mb-1">
              No subscriptions found
            </Text>
            <Text className="text-sm font-sans-medium text-muted-foreground text-center mb-4">
              {"Try adjusting your search query or filter to find what you're looking for."}
            </Text>
            {(searchQuery || selectedFilter !== "All") && (
              <TouchableOpacity
                className="rounded-full bg-primary px-5 py-2.5"
                onPress={() => {
                  setSearchQuery("");
                  setSelectedFilter("All");
                }}
              >
                <Text className="text-white font-sans-semibold">Reset Search</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Subscriptions