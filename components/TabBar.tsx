import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, LayoutChangeEvent } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, components } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabs } from '@/constants/data';

const tabBar = components.tabBar;
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface LayoutInfo {
  x: number;
  width: number;
}

const TabButton = ({
  focused,
  icon,
  title,
  onPress,
  onLongPress,
  onLayout,
}: {
  focused: boolean;
  icon: any;
  title: string;
  onPress: () => void;
  onLongPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      // Bouncy spring animation on selection
      scale.value = withSequence(
        withTiming(0.85, { duration: 60 }),
        withSpring(1.22, { damping: 9, stiffness: 140 }),
        withSpring(1.05, { damping: 12, stiffness: 100 })
      );
      // Playful rotation wobble
      rotate.value = withSequence(
        withTiming(15, { duration: 80 }),
        withTiming(-12, { duration: 80 }),
        withSpring(0, { damping: 8 })
      );
    } else {
      scale.value = withSpring(1.0);
      rotate.value = withSpring(0);
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotate.value}deg` }
      ],
      opacity: withTiming(focused ? 1.0 : 0.45, { duration: 150 }),
    };
  });

  return (
    <TouchableOpacity
      onLayout={onLayout}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={title}
      testID={`tab-button-${title}`}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Image 
          source={icon} 
          style={[
            styles.icon,
            { tintColor: focused ? '#ffffff' : 'rgba(255, 255, 255, 0.45)' }
          ]} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Track dynamic layout measurements of each tab item
  const [layouts, setLayouts] = useState<Record<number, LayoutInfo>>({});

  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get('window').width - tabBar.horizontalInset * 2
  );

  // Filter out details page or other routes with href === null
  const activeRoutes = state.routes.filter(
    (route) => {
      const options = descriptors[route.key].options as any;
      return options.href !== null;
    }
  );

  const activeIndex = activeRoutes.findIndex(
    (route) => route.name === state.routes[state.index].name
  );

  const paddingHorizontal = 8;
  const contentWidth = containerWidth - paddingHorizontal * 2;
  const pillSize = 48;

  const translateX = useSharedValue(0);

  // Dynamic alignment calculation
  useEffect(() => {
    if (activeIndex !== -1) {
      const activeLayout = layouts[activeIndex];
      
      // Calculate target X position.
      // If layout measurements from onLayout are ready, use them.
      // Otherwise, use fallback mathematically-estimated layout.
      const targetX = activeLayout
        ? activeLayout.x + (activeLayout.width - pillSize) / 2
        : activeIndex * (contentWidth / activeRoutes.length) + (contentWidth / activeRoutes.length - pillSize) / 2 + paddingHorizontal;

      translateX.value = withSpring(targetX, {
        damping: 15,
        stiffness: 100,
        mass: 0.8
      });
    }
  }, [activeIndex, layouts, contentWidth, activeRoutes.length]);

  const pillAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((prev) => {
      // Prevent redundant state updates if layout is unchanged
      if (prev[index]?.x === x && prev[index]?.width === width) {
        return prev;
      }
      return {
        ...prev,
        [index]: { x, width }
      };
    });
  };

  const handlePress = (route: any, isFocused: boolean) => {
    // Light tactile feedback on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const handleLongPress = (route: any) => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  return (
    <View 
      style={[
        styles.container, 
        { bottom: Math.max(insets.bottom, tabBar.horizontalInset) }
      ]}
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
      }}
    >
      {/* Absolute sliding background indicator with linear gradient */}
      <AnimatedLinearGradient
        colors={['#ea7a53', '#f39270']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.slidingPill, pillAnimatedStyle]}
      />

      {activeRoutes.map((route, index) => {
        const isFocused = activeIndex === index;
        const tabData = tabs.find((t) => t.name === route.name);
        
        if (!tabData) return null;

        const options = descriptors[route.key].options;
        const title = options.title !== undefined ? options.title : route.name;

        return (
          <TabButton
            key={route.key}
            focused={isFocused}
            icon={tabData.icon}
            title={title}
            onPress={() => handlePress(route, isFocused)}
            onLongPress={() => handleLongPress(route)}
            onLayout={(e) => handleLayout(index, e)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    left: tabBar.horizontalInset,
    right: tabBar.horizontalInset,
    height: tabBar.height,
    borderRadius: tabBar.radius,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    zIndex: 99,
    paddingHorizontal: 8,
  },
  slidingPill: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    // Center vertically in a container of height tabBar.height
    top: (tabBar.height - 48) / 2,
    left: 0, // start at 0 since targetX includes paddingHorizontal offset
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});
