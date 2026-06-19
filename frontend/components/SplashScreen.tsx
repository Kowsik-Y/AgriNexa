import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  theme: 'light' | 'dark';
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, theme }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(15)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;
  const overallOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const isDark = theme === 'dark';

  useEffect(() => {
    // Pulse animation for the glow ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const animation = Animated.sequence([
      // Phase 1: Logo entrance with scale + fade + subtle rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Glow ring appears
        Animated.timing(ringOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          friction: 5,
          tension: 30,
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: "AgriNexa" text slides up + fades in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // Phase 3: Tagline appears
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // Phase 4: Loading dots
      Animated.stagger(150, [
        Animated.spring(dotScale1, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.spring(dotScale2, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.spring(dotScale3, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      ]),

      // Phase 5: Shimmer effect across logo
      Animated.timing(shimmerPosition, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),

      // Hold
      Animated.delay(600),

      // Phase 6: Fade out
      Animated.timing(overallOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    pulseLoop.start();
    animation.start(() => {
      pulseLoop.stop();
      onFinish();
    });

    return () => {
      pulseLoop.stop();
    };
  }, []);

  const rotateInterpolation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const shimmerTranslate = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: overallOpacity,
          backgroundColor: isDark ? '#0F172A' : '#F0FDF4',
        },
      ]}
    >
      {/* Background decorative elements */}
      <View style={styles.bgDecoration}>
        <View
          style={[
            styles.bgCircle,
            styles.bgCircle1,
            { borderColor: isDark ? 'rgba(52, 211, 153, 0.06)' : 'rgba(16, 185, 129, 0.06)' },
          ]}
        />
        <View
          style={[
            styles.bgCircle,
            styles.bgCircle2,
            { borderColor: isDark ? 'rgba(52, 211, 153, 0.04)' : 'rgba(16, 185, 129, 0.04)' },
          ]}
        />
        <View
          style={[
            styles.bgCircle,
            styles.bgCircle3,
            { borderColor: isDark ? 'rgba(52, 211, 153, 0.02)' : 'rgba(16, 185, 129, 0.02)' },
          ]}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Glow ring behind logo */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              transform: [{ scale: Animated.multiply(ringScale, pulseAnim) }],
              opacity: ringOpacity,
              backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            },
          ]}
        />

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoScale },
                { rotate: rotateInterpolation },
              ],
              opacity: logoOpacity,
            },
          ]}
        >
          <View style={styles.logoShadow}>
            <Image
              source={require('../assets/images/agrinexa-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          />
        </Animated.View>

        {/* App name */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.appName,
              { color: isDark ? '#F1F5F9' : '#0F172A' },
            ]}
          >
            Agri
            <Text style={[styles.appNameAccent, { color: isDark ? '#34D399' : '#10B981' }]}>
              Nexa
            </Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          <Text
            style={[
              styles.tagline,
              { color: isDark ? '#94A3B8' : '#64748B' },
            ]}
          >
            Smart Farming, Simplified
          </Text>
        </Animated.View>

        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          {[dotScale1, dotScale2, dotScale3].map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  transform: [{ scale: dot }],
                  backgroundColor: isDark ? '#34D399' : '#10B981',
                  opacity: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.8],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom branding */}
      <Animated.View
        style={[
          styles.bottomBrand,
          { opacity: taglineOpacity },
        ]}
      >
        <Text
          style={[
            styles.bottomText,
            { color: isDark ? '#475569' : '#94A3B8' },
          ]}
        >
          Powered by AgriNexa
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgDecoration: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  bgCircle1: {
    width: width * 0.8,
    height: width * 0.8,
  },
  bgCircle2: {
    width: width * 1.2,
    height: width * 1.2,
  },
  bgCircle3: {
    width: width * 1.6,
    height: width * 1.6,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 28,
    overflow: 'hidden',
    borderRadius: 28,
  },
  logoShadow: {
    width: 120,
    height: 120,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 60,
    transform: [{ skewX: '-20deg' }],
  },
  textContainer: {
    marginBottom: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appNameAccent: {
    fontWeight: '800',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottomBrand: {
    position: 'absolute',
    bottom: 60,
  },
  bottomText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
