import { icons } from '@/constants/icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ImageSourcePropType, Text, View } from 'react-native';

interface BrandLogoProps {
  icon: ImageSourcePropType | string;
  name: string;
  color?: string;
  size?: number;
}

export default function BrandLogo({ icon, name, color, size = 64 }: BrandLogoProps) {
  const isWebImage =
    (icon && typeof icon === 'object' && 'uri' in icon && typeof icon.uri === 'string') ||
    (typeof icon === 'string' && icon.startsWith('http'));

  const isFallback =
    icon === icons.plus ||
    !icon ||
    (icon && typeof icon === 'object' && !('uri' in icon) && !isWebImage);

  const containerSize = size;
  const borderRadius = size * 0.18; // Elegant continuous squircle approximation (app icon shape)

  const padding = size * 0.12; // Contain logos nicely inside the glass button frame
  const fontSize = size * 0.42; // Responsive readable text size
  const iconSource = typeof icon === 'string'
    ? { uri: icon }
    : icon;

  if (isFallback) {
    // Premium colored glassmorphism letter avatar
    return (
      <View
        style={{
          width: containerSize,
          height: containerSize,
          borderRadius: borderRadius,
          backgroundColor: color || '#ea7a53',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 0.5,
          borderColor: 'rgba(255, 255, 255, 0.35)', // Thin glossy bezel
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4.5,
          elevation: 2,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            fontSize: fontSize,
            fontFamily: 'sans-bold',
            color: '#081126',
            textTransform: 'uppercase',
            textShadowColor: 'rgba(0, 0, 0, 0.12)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 1.5,
            zIndex: 2,
          }}
        >
          {name ? name.charAt(0).toUpperCase() : '?'}
        </Text>

        {/* Strong Glossy Diagonal Glare Overlay */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.65, y: 0.65 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 3,
          }}
          pointerEvents="none"
        />

        {/* High-contrast Edge Glare Highlight Bezel */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: '8%',
            right: '8%',
            height: 1.5,
            zIndex: 3,
          }}
          pointerEvents="none"
        />

        {/* Bottom Ambient Glow / 3D Volumetric Shadow */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.0)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '30%',
            zIndex: 3,
          }}
          pointerEvents="none"
        />
      </View>
    );
  }

  // Normal logos (local or web) get a premium liquid glass backing & glossy reflections.
  // This turns square/white-background web logos into polished glossy physical-like tiles.
  return (
    <LinearGradient
      colors={['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.02)']} // Completely colorless/transparent glass base
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        padding: padding,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.35)', // Thin glossy border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
      }}
    >
      <Image
        source={iconSource}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: Math.max(0, borderRadius - padding), // Match the squircle container corners
          zIndex: 1,
        }}
        resizeMode="contain"
      />

      {/* Glossy Diagonal Glare Overlay */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.65, y: 0.65 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
        }}
        pointerEvents="none"
      />

      {/* Edge Glare Highlight Bezel */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0.0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: '8%',
          right: '8%',
          height: 1.5,
          zIndex: 2,
        }}
        pointerEvents="none"
      />

      {/* Bottom Ambient Glow / Shading */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.0)']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '25%',
          zIndex: 2,
        }}
        pointerEvents="none"
      />
    </LinearGradient>
  );
}
