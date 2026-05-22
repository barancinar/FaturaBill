import images from "@/constants/images";
import { useClerk, useUser } from "@clerk/expo";
import { styled } from "nativewind";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <SafeAreaView className="flex-1 bg-background p-5 pt-8">
      {/* Header */}
      <Text className="text-3xl font-sans-bold text-primary mb-6">Settings</Text>

      {/* Profile Card */}
      {user && (
        <View className="items-center bg-card border border-border rounded-3xl p-6 mb-6">
          <Image
            source={user.imageUrl ? { uri: user.imageUrl } : images.avatar}
            className="w-20 h-20 rounded-full border-2 border-accent mb-3"
          />
          <Text className="text-xl font-sans-bold text-primary">
            {user.fullName || user.emailAddresses[0]?.emailAddress.split("@")[0]}
          </Text>
          <Text className="text-sm font-sans-medium text-muted-foreground mt-1">
            {user.emailAddresses[0]?.emailAddress}
          </Text>
        </View>
      )}

      {/* Settings Options */}
      <View className="gap-3 mb-8">
        <Pressable className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4">
          <Text className="text-base font-sans-semibold text-primary">Notifications</Text>
          <Text className="text-sm font-sans-semibold text-accent">Enabled</Text>
        </Pressable>

        <Pressable className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4">
          <Text className="text-base font-sans-semibold text-primary">Currency</Text>
          <Text className="text-sm font-sans-semibold text-accent">USD ($)</Text>
        </Pressable>

        <Pressable className="flex-row items-center justify-between bg-card border border-border rounded-2xl px-5 py-4">
          <Text className="text-base font-sans-semibold text-primary">Help & Support</Text>
        </Pressable>
      </View>

      {/* Sign Out Button */}
      <Pressable
        onPress={() => signOut()}
        className="mt-auto mb-30 items-center rounded-2xl bg-destructive py-4 border border-destructive/20"
      >
        <Text className="text-base font-sans-bold text-white">Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default Settings;