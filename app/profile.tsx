import React, { useState, useEffect } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { styled } from "nativewind";
import images from "@/constants/images";
import { clsx } from "clsx";

const SafeAreaView = styled(RNSafeAreaView);

const Profile = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { t } = useTranslation();
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState((user?.unsafeMetadata?.phone as string) || "");
  const [bio, setBio] = useState((user?.unsafeMetadata?.bio as string) || "");
  const [isInitialized, setIsInitialized] = useState(false);

  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Sync state when Clerk user loads
  useEffect(() => {
    if (user && !isInitialized) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone((user.unsafeMetadata?.phone as string) || "");
      setBio((user.unsafeMetadata?.bio as string) || "");
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  const emailAddress = user?.emailAddresses?.[0]?.emailAddress || "";
  const isInteractionDisabled = !isLoaded || !isSignedIn || !user;

  const onPickImage = async () => {
    if (isInteractionDisabled || !user) {
      Alert.alert(
        t("details.error", { defaultValue: "Error" }),
        t("profile.saveError", { defaultValue: "Failed to update profile. Please try again." })
      );
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t("details.error", { defaultValue: "Error" }),
          t("profile.permissionError", { defaultValue: "We need access to your photo library to update your profile photo." })
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImageUploading(true);
        const base64 = result.assets[0].base64;
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        const imageUri = `data:${mimeType};base64,${base64}`;

        await user.setProfileImage({
          file: imageUri,
        });

        Alert.alert(
          t("common.active", { defaultValue: "Success" }),
          t("profile.saveSuccess", { defaultValue: "Profile updated successfully!" })
        );
      }
    } catch (err) {
      console.error("Error setting profile image:", err);
      Alert.alert(
        t("details.error", { defaultValue: "Error" }),
        t("profile.pickImageError", { defaultValue: "Failed to select image." })
      );
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (isInteractionDisabled || !user) {
      Alert.alert(
        t("details.error", { defaultValue: "Error" }),
        t("profile.saveError", { defaultValue: "Failed to update profile. Please try again." })
      );
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(
        t("details.error", { defaultValue: "Error" }),
        t("details.errorFillFields", { defaultValue: "Please fill in all fields." })
      );
      return;
    }

    try {
      setSaving(true);
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: {
          ...user.unsafeMetadata,
          phone: phone.trim(),
          bio: bio.trim(),
        },
      });

      Alert.alert(
        t("common.active", { defaultValue: "Success" }),
        t("profile.saveSuccess", { defaultValue: "Profile updated successfully!" })
      );
    } catch (err) {
      console.error("Error updating profile:", err);
      Alert.alert(
        t("details.error", { defaultValue: "Error" }),
        t("profile.saveError", { defaultValue: "Failed to update profile. Please try again." })
      );
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = firstName.trim() !== "" && lastName.trim() !== "";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
        <Pressable 
          onPress={() => router.back()} 
          className="size-10 items-center justify-center rounded-full bg-card border border-border active:opacity-70"
        >
          <Feather name="chevron-left" size={24} color="#081126" />
        </Pressable>
        <Text className="text-xl font-sans-bold text-primary">
          {t("profile.title", { defaultValue: "Edit Profile" })}
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="p-5 pb-10 gap-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View className="items-center mt-2">
            <Pressable 
              onPress={onPickImage}
              disabled={imageUploading || isInteractionDisabled}
              className="relative active:opacity-90"
            >
              <View className="w-28 h-28 rounded-full border-2 border-accent overflow-hidden items-center justify-center bg-card">
                {imageUploading ? (
                  <ActivityIndicator size="large" color="#ea7a53" />
                ) : (
                  <Image
                    source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
                    className="w-full h-full"
                  />
                )}
              </View>
              {/* Camera Icon Overlay */}
              <View className="absolute bottom-0 right-0 bg-accent rounded-full p-2 border-2 border-background">
                <Feather name="camera" size={16} color="#081126" />
              </View>
            </Pressable>
            
            <Pressable onPress={onPickImage} disabled={imageUploading || isInteractionDisabled} className="mt-3 active:opacity-70">
              <Text className="text-sm font-sans-semibold text-accent">
                {t("profile.editPhoto", { defaultValue: "Edit Photo" })}
              </Text>
            </Pressable>
          </View>

          {/* Form Fields Card */}
          <View className="bg-card border border-border rounded-3xl p-5 gap-4">
            {/* First Name */}
            <View className="auth-field">
              <Text className="auth-label">{t("profile.firstName", { defaultValue: "First Name" })}</Text>
              <TextInput
                className="auth-input"
                placeholder={t("profile.fields.placeholderFirstName", { defaultValue: "Enter your first name" })}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                editable={!saving && !isInteractionDisabled}
              />
            </View>

            {/* Last Name */}
            <View className="auth-field">
              <Text className="auth-label">{t("profile.lastName", { defaultValue: "Last Name" })}</Text>
              <TextInput
                className="auth-input"
                placeholder={t("profile.fields.placeholderLastName", { defaultValue: "Enter your last name" })}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                editable={!saving && !isInteractionDisabled}
              />
            </View>

            {/* Email Address (Disabled) */}
            <View className="auth-field">
              <Text className="auth-label">{t("profile.email", { defaultValue: "Email Address" })}</Text>
              <TextInput
                className="auth-input bg-muted/30 opacity-60"
                value={emailAddress}
                editable={false}
                selectTextOnFocus={false}
              />
            </View>

            {/* Phone Number */}
            <View className="auth-field">
              <Text className="auth-label">{t("profile.phone", { defaultValue: "Phone Number" })}</Text>
              <TextInput
                className="auth-input"
                placeholder={t("profile.fields.placeholderPhone", { defaultValue: "Enter your phone number" })}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!saving && !isInteractionDisabled}
              />
            </View>

            {/* Bio / Description */}
            <View className="auth-field">
              <Text className="auth-label">{t("profile.bio", { defaultValue: "Bio / Note" })}</Text>
              <TextInput
                className="auth-input min-h-24 pt-3"
                placeholder={t("profile.fields.placeholderBio", { defaultValue: "Enter a short bio or notes..." })}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!saving && !isInteractionDisabled}
              />
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            className={clsx("auth-button flex-row justify-center items-center gap-2", (!isFormValid || saving || isInteractionDisabled) && "auth-button-disabled")}
            disabled={!isFormValid || saving || isInteractionDisabled}
            onPress={handleSave}
          >
            {saving && <ActivityIndicator size="small" color="#081126" />}
            <Text className="auth-button-text">
              {saving ? t("profile.saving", { defaultValue: "Saving..." }) : t("common.save", { defaultValue: "Save" })}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Profile;
