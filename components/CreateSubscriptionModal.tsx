import BrandLogo from '@/components/BrandLogo';
import { BRAND_TEMPLATES, BrandTemplate, SubscriptionPlan, getPriceForCurrency } from '@/constants/brandTemplates';
import { icons } from '@/constants/icons';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptions';
import { useAnalytics } from '@/lib/analytics';
import { usePreferredCurrency } from '@/lib/settingsStore';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

interface CreateSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (newSubscription: Subscription) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Entertainment": "#ffd1d1",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  "Design": "#f5c542",
  "Productivity": "#ffe5d9",
  "Cloud": "#d0ebff",
  "Music": "#d3f9d8",
  "Other": "#e2e8f0"
};

const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const convertHslToHexIfHsl = (color: string): string => {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)/);
    if (match) {
      const h = parseFloat(match[1]);
      const s = parseFloat(match[2]);
      const l = parseFloat(match[3]);
      return hslToHex(h, s, l);
    }
  }
  return color;
};

// Generates an elegant dynamic HSL pastel color based on brand name hash, converted to hex
const getBrandColor = (brandName: string, selectedBrand: BrandTemplate | null, category: string): string => {
  if (selectedBrand) return convertHslToHexIfHsl(selectedBrand.color);
  if (!brandName.trim()) return CATEGORY_COLORS[category] || '#e2e8f0';
  
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 65; // Pastel saturation
  const l = 80; // High lightness for premium soft look
  return hslToHex(h, s, l);
};

// logo.dev dynamic resolver
const getDynamicLogoUrl = (brandName: string): string | null => {
  const token = process.env.EXPO_PUBLIC_LOGO_DEV_TOKEN;
  if (process.env.NODE_ENV !== 'production') {
    console.log("[Logo.dev] Token from process.env:", token ? "FOUND" : "NOT FOUND (Make sure to restart Expo bundler after adding to .env)");
  }
  if (!token) return null;
  
  const clean = brandName
    .toLowerCase()
    .trim()
    .split(' ')[0] // Take only the first word (e.g., "Slack Technologies" -> "slack")
    .replace(/[^a-z0-9.-]/g, ''); // Keep alphanumeric, hyphens, and periods
    
  if (!clean) return null;
  
  const domainMapping: Record<string, string> = {
    chatgpt: 'openai.com',
    chatgptplus: 'openai.com',
    openai: 'openai.com',
    claude: 'anthropic.com',
    claudepro: 'anthropic.com',
    githubcopilot: 'github.com',
    gemini: 'google.com',
  };
  
  const domain = domainMapping[clean] || `${clean}.com`;
  const resolvedUrl = `https://img.logo.dev/${domain}?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log("[Logo.dev] Resolved URL:", resolvedUrl);
  }
  return resolvedUrl;
};

export default function CreateSubscriptionModal({ visible, onClose, onCreate }: CreateSubscriptionModalProps) {
  const { t } = useTranslation();
  const { trackSubscriptionCreateStarted, trackSubscriptionCreateCancelled, trackSubscriptionCreated } = useAnalytics();
  const preferredCurrency = usePreferredCurrency();
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [frequency, setFrequency] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [category, setCategory] = useState('Entertainment');
  
  // Brand template states
  const [selectedBrand, setSelectedBrand] = useState<BrandTemplate | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      if (!hasTrackedRef.current) {
        trackSubscriptionCreateStarted();
        hasTrackedRef.current = true;
      }
    } else {
      hasTrackedRef.current = false;
    }
  }, [visible, trackSubscriptionCreateStarted]);

  useEffect(() => {
    if (visible) {
      setCurrency(preferredCurrency);
    }
  }, [visible, preferredCurrency]);

  const handleClose = () => {
    // Reset form states
    setName('');
    setPrice('');
    setCurrency(preferredCurrency);
    setFrequency('Monthly');
    setCategory('Entertainment');
    setSelectedBrand(null);
    setSelectedPlan(null);
    setShowSuggestions(false);
    onClose();
  };

  const handleCancel = () => {
    trackSubscriptionCreateCancelled();
    handleClose();
  };

  const handleSelectBrand = (brand: BrandTemplate) => {
    setSelectedBrand(brand);
    setName(brand.name);
    setCategory(brand.category);
    setShowSuggestions(false);
    
    if (brand.plans && brand.plans.length > 0) {
      const firstPlan = brand.plans[0];
      setSelectedPlan(firstPlan);
      const resolved = getPriceForCurrency(firstPlan, preferredCurrency);
      setPrice(resolved.price.toString());
      setCurrency(resolved.currency);
      setFrequency(firstPlan.billing);
    } else {
      setSelectedPlan(null);
      setPrice('');
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    
    if (text.trim() === '') {
      setSelectedBrand(null);
      setSelectedPlan(null);
      setShowSuggestions(false);
      return;
    }
    
    setShowSuggestions(true);
    
    // Fuzzy matching against template name or aliases
    const matched = BRAND_TEMPLATES.find(brand => 
      brand.name.toLowerCase() === text.toLowerCase() ||
      brand.searchAliases.some(alias => alias.toLowerCase() === text.toLowerCase())
    );
    
    if (matched) {
      setSelectedBrand(matched);
      setCategory(matched.category);
      if (matched.plans && matched.plans.length > 0 && !price) {
        const firstPlan = matched.plans[0];
        setSelectedPlan(firstPlan);
        const resolved = getPriceForCurrency(firstPlan, preferredCurrency);
        setPrice(resolved.price.toString());
        setCurrency(resolved.currency);
        setFrequency(firstPlan.billing);
      }
    } else {
      // If we change name, make sure we detach selected brand if it no longer matches
      if (selectedBrand && !text.toLowerCase().startsWith(selectedBrand.name.toLowerCase().substring(0, 3))) {
        setSelectedBrand(null);
        setSelectedPlan(null);
      }
    }
  };

  const filteredSuggestions = useMemo(() => {
    if (!name.trim()) return [];
    return BRAND_TEMPLATES.filter(brand => 
      brand.name.toLowerCase().includes(name.toLowerCase()) ||
      brand.searchAliases.some(alias => alias.toLowerCase().includes(name.toLowerCase()))
    );
  }, [name]);

  const parsedPrice = parseFloat(price);
  const isValid = name.trim().length > 0 && !isNaN(parsedPrice) && parsedPrice > 0;
  const activeAccentColor = selectedBrand ? selectedBrand.color : '#ea7a53';

  const handleSubmit = () => {
    if (!isValid) return;

    const startDate = dayjs().toISOString();
    const renewalDate = frequency === 'Monthly'
      ? dayjs().add(1, 'month').toISOString()
      : dayjs().add(1, 'year').toISOString();

    let resolvedIcon = icons.plus;
    if (selectedBrand) {
      if (icons[selectedBrand.icon] === icons.plus) {
        const url = getDynamicLogoUrl(selectedBrand.name);
        resolvedIcon = url ? { uri: url } : icons.plus;
      } else {
        resolvedIcon = icons[selectedBrand.icon];
      }
    } else {
      const url = getDynamicLogoUrl(name.trim());
      resolvedIcon = url ? { uri: url } : icons.plus;
    }

    const subColor = selectedBrand 
      ? selectedBrand.color 
      : getBrandColor(name.trim(), null, category);

    const newSub: Subscription = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      icon: resolvedIcon,
      name: name.trim(),
      plan: selectedPlan ? selectedPlan.name : undefined,
      price: parsedPrice,
      billing: frequency,
      category,
      status: 'active',
      startDate,
      renewalDate,
      color: subColor,
      currency,
    };

    onCreate(newSub);

    trackSubscriptionCreated({
      subscription_name: name.trim(),
      subscription_price: parsedPrice,
      subscription_frequency: frequency,
      subscription_category: category,
      subscription_currency: currency,
    });

    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View className="modal-overlay justify-end">
        {/* Backdrop touch to dismiss */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handleCancel} 
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="modal-container"
        >
          <View className="modal-header">
            <Text className="modal-title">{t('createModal.title', { defaultValue: 'New Subscription' })}</Text>
            <Pressable className="modal-close" onPress={handleCancel}>
              <Text className="modal-close-text">✕</Text>
            </Pressable>
          </View>
          
          <ScrollView 
            contentContainerClassName="modal-body pb-10" 
            keyboardShouldPersistTaps="handled"
          >
            {/* Quick Templates Slider */}
            <View className="mb-2">
              <Text className="auth-label mb-3">{t('createModal.popularTemplates', { defaultValue: 'Popular Brands' })}</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ gap: 10, paddingRight: 16 }}
              >
                {BRAND_TEMPLATES.map((brand) => {
                  const isSelected = selectedBrand?.id === brand.id;
                  
                  // Handle logo.dev resolution or fallback icon for templates
                  const logoIcon = icons[brand.icon] === icons.plus 
                    ? (getDynamicLogoUrl(brand.name) || icons.plus) 
                    : icons[brand.icon];

                  return (
                    <Pressable
                      key={brand.id}
                      onPress={() => handleSelectBrand(brand)}
                      style={{ borderRadius: 16, overflow: 'hidden' }}
                    >
                      <LinearGradient
                        colors={isSelected 
                          ? [brand.color + '25', brand.color + '0a'] 
                          : ['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.55)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: isSelected ? brand.color + 'cc' : 'rgba(255, 255, 255, 0.85)',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1.5 },
                          shadowOpacity: isSelected ? 0.04 : 0.02,
                          shadowRadius: 2,
                          elevation: 1,
                        }}
                      >
                        <BrandLogo 
                          icon={logoIcon} 
                          name={brand.name} 
                          color={brand.color} 
                          size={24} 
                        />
                        <Text 
                          style={{
                            fontSize: 14,
                            fontFamily: 'sans-bold',
                            color: isSelected ? brand.color : '#081126',
                          }}
                        >
                          {brand.name}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Name input */}
            <View className="auth-field z-50" style={{ position: 'relative' }}>
              <Text className="auth-label">{t('createModal.nameLabel', { defaultValue: 'Name' })}</Text>
              
              <View className="relative justify-center">
                {/* Logo Prefix Badge */}
                {(selectedBrand || name.trim().length > 0) && (
                  <View className="absolute left-3.5 z-10">
                    <BrandLogo 
                      icon={selectedBrand 
                        ? (icons[selectedBrand.icon] === icons.plus 
                            ? (getDynamicLogoUrl(selectedBrand.name) || icons.plus) 
                            : icons[selectedBrand.icon])
                        : (getDynamicLogoUrl(name) || icons.plus)
                      } 
                      name={name} 
                      color={selectedBrand ? selectedBrand.color : getBrandColor(name, null, category)} 
                      size={32} 
                    />
                  </View>
                )}
                
                <TextInput
                  className={clsx("auth-input flex-1", (selectedBrand || name.trim().length > 0) ? "pl-14" : "pl-4")}
                  placeholder={t('createModal.namePlaceholder', { defaultValue: 'Subscription Name' })}
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={name}
                  onChangeText={handleNameChange}
                  onFocus={() => setShowSuggestions(true)}
                  style={selectedBrand ? { borderColor: activeAccentColor } : undefined}
                />
              </View>
              
              {/* Floating suggestion list dropdown */}
              {name.trim().length > 0 && showSuggestions && (filteredSuggestions.length > 0 || !selectedBrand) && (
                <View className="absolute top-[84px] left-0 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl max-h-56 overflow-hidden">
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {filteredSuggestions.map((brand) => (
                      <Pressable
                        key={brand.id}
                        onPress={() => {
                          handleSelectBrand(brand);
                          setShowSuggestions(false);
                        }}
                        className="flex-row items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted"
                      >
                        <View className="flex-row items-center gap-3">
                          <BrandLogo 
                            icon={icons[brand.icon] === icons.plus 
                              ? (getDynamicLogoUrl(brand.name) || icons.plus) 
                              : icons[brand.icon]
                            } 
                            name={brand.name} 
                            color={brand.color} 
                            size={32} 
                          />
                          <Text className="text-base font-sans-bold text-primary">{brand.name}</Text>
                        </View>
                        <Text className="text-xs font-sans-semibold text-muted-foreground">{brand.category}</Text>
                      </Pressable>
                    ))}
                    {/* logo.dev custom resolution option */}
                    {name.trim().length > 0 && !selectedBrand && (
                      <Pressable
                        onPress={() => {
                          setShowSuggestions(false);
                        }}
                        className="flex-row items-center justify-between px-4 py-3.5 active:bg-muted"
                      >
                        <View className="flex-row items-center gap-3">
                          <BrandLogo 
                            icon={getDynamicLogoUrl(name) || icons.plus} 
                            name={name} 
                            color={getBrandColor(name, null, category)} 
                            size={32} 
                          />
                          <Text className="text-base font-sans-semibold text-primary">
                            {`"${name.trim()}"`} {t('createModal.dynamicLogoSuffix', { defaultValue: '(Dynamic Logo)' })}
                          </Text>
                        </View>
                        <Text className="text-xs font-sans-bold text-accent">
                          {t('createModal.searchWeb', { defaultValue: 'Search Web' })}
                        </Text>
                      </Pressable>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Plan selector (if templates selected) */}
            {selectedBrand && selectedBrand.plans.length > 0 && (
              <View className="auth-field">
                <Text className="auth-label">{t('createModal.choosePlan', { defaultValue: 'Choose Plan' })}</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 8, paddingRight: 16 }}
                >
                  {selectedBrand.plans.map((plan) => {
                    const isSelected = selectedPlan?.name === plan.name;
                    const resolved = getPriceForCurrency(plan, currency);
                    return (
                      <Pressable
                        key={plan.name}
                        onPress={() => {
                          setSelectedPlan(plan);
                          setPrice(resolved.price.toString());
                          setCurrency(resolved.currency);
                          setFrequency(plan.billing);
                        }}
                        className={clsx(
                          "px-4 py-2.5 rounded-2xl border items-center justify-center",
                          isSelected ? "" : "border-border bg-background"
                        )}
                        style={isSelected ? { 
                          backgroundColor: activeAccentColor + '10', 
                          borderColor: activeAccentColor 
                        } : undefined}
                      >
                        <Text 
                          className={clsx("text-sm", isSelected ? "font-sans-bold" : "font-sans-semibold text-muted-foreground")}
                          style={isSelected ? { color: activeAccentColor } : undefined}
                        >
                          {t(`plans.${plan.name}`, { defaultValue: plan.name })} ({resolved.currency === currency ? "" : `${resolved.currency} `}{resolved.price})
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Price input */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.priceLabel', { defaultValue: 'Price' })}</Text>
              <TextInput
                className="auth-input"
                placeholder={t('createModal.pricePlaceholder', { defaultValue: '0.00' })}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={(val) => {
                  setPrice(val);
                  setSelectedPlan(null); // Detach predefined plan suggestions since price is edited
                }}
                onFocus={() => setShowSuggestions(false)}
                style={selectedBrand ? { borderColor: activeAccentColor } : undefined}
              />
            </View>

            {/* Currency options */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.currencyLabel', { defaultValue: 'Currency' })}</Text>
              <View className="picker-row">
                {(['TRY', 'USD', 'EUR'] as const).map((curr) => (
                  <Pressable
                    key={curr}
                    className={clsx("picker-option", currency === curr && "picker-option-active")}
                    style={currency === curr ? { 
                      borderColor: activeAccentColor, 
                      backgroundColor: activeAccentColor + '10' 
                    } : undefined}
                    onPress={() => {
                      setCurrency(curr);
                      if (selectedPlan) {
                        if (selectedPlan.prices && selectedPlan.prices[curr] !== undefined) {
                          setPrice(selectedPlan.prices[curr]!.toString());
                        } else {
                          setSelectedPlan(null);
                        }
                      }
                    }}
                  >
                    <Text 
                      className={clsx("picker-option-text", currency === curr && "picker-option-text-active")}
                      style={currency === curr ? { color: activeAccentColor } : undefined}
                    >
                      {curr}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Frequency options */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.frequencyLabel', { defaultValue: 'Frequency' })}</Text>
              <View className="picker-row">
                <Pressable
                  className={clsx("picker-option", frequency === "Monthly" && "picker-option-active")}
                  style={frequency === "Monthly" ? { 
                    borderColor: activeAccentColor, 
                    backgroundColor: activeAccentColor + '10' 
                  } : undefined}
                  onPress={() => {
                    setFrequency("Monthly");
                    setSelectedPlan(null);
                  }}
                >
                  <Text 
                    className={clsx("picker-option-text", frequency === "Monthly" && "picker-option-text-active")}
                    style={frequency === "Monthly" ? { color: activeAccentColor } : undefined}
                  >
                    {t('createModal.frequencyMonthly', { defaultValue: 'Monthly' })}
                  </Text>
                </Pressable>
                <Pressable
                  className={clsx("picker-option", frequency === "Yearly" && "picker-option-active")}
                  style={frequency === "Yearly" ? { 
                    borderColor: activeAccentColor, 
                    backgroundColor: activeAccentColor + '10' 
                  } : undefined}
                  onPress={() => {
                    setFrequency("Yearly");
                    setSelectedPlan(null);
                  }}
                >
                  <Text 
                    className={clsx("picker-option-text", frequency === "Yearly" && "picker-option-text-active")}
                    style={frequency === "Yearly" ? { color: activeAccentColor } : undefined}
                  >
                    {t('createModal.frequencyYearly', { defaultValue: 'Yearly' })}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Category selection */}
            <View className="auth-field">
              <Text className="auth-label">{t('createModal.categoryLabel', { defaultValue: 'Category' })}</Text>
              <View className="category-scroll">
                {SUBSCRIPTION_CATEGORIES.map((cat) => {
                  const isActive = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      className={clsx("category-chip", isActive && "category-chip-active")}
                      style={isActive ? { 
                        borderColor: activeAccentColor, 
                        backgroundColor: activeAccentColor + '10' 
                      } : undefined}
                      onPress={() => {
                        setCategory(cat);
                        setSelectedBrand(null);
                        setSelectedPlan(null);
                      }}
                    >
                      <Text 
                        className={clsx("category-chip-text", isActive && "category-chip-text-active")}
                        style={isActive ? { color: activeAccentColor } : undefined}
                      >
                        {t(`categories.${cat}`, { defaultValue: cat })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Submit button */}
            <Pressable
              className={clsx("auth-button", !isValid && "auth-button-disabled")}
              disabled={!isValid}
              onPress={handleSubmit}
              style={isValid ? { backgroundColor: activeAccentColor } : { backgroundColor: activeAccentColor + '45' }}
            >
              <Text className="auth-button-text" style={isValid ? { color: '#fff' } : { color: 'rgba(255,255,255,0.6)' }}>
                {t('createModal.submit', { defaultValue: 'Add Subscription' })}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
