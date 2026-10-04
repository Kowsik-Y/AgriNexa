import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl, Animated } from 'react-native';
import { Stack } from 'expo-router';
import {
  Clock3,
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  Sun,
  Wind,
} from 'lucide-react-native';

import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useApi } from '@/hooks/use-api';

export default function WeatherHourlyScreen() {
  const { colors } = useTheme();
  const { getHourlyWeather, getWeatherTimeline } = useApi();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hourlyData, setHourlyData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [hourRange, setHourRange] = useState<24 | 48 | 72>(24);
  const [dayRange, setDayRange] = useState<7 | 10 | 14>(7);
  const [debouncedHourRange, setDebouncedHourRange] = useState<24 | 48 | 72>(24);
  const [debouncedDayRange, setDebouncedDayRange] = useState<7 | 10 | 14>(7);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHourRange(hourRange);
    }, 220);
    return () => clearTimeout(timer);
  }, [hourRange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDayRange(dayRange);
    }, 220);
    return () => clearTimeout(timer);
  }, [dayRange]);

  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      if (hasLoadedRef.current) {
        setIsUpdating(true);
      } else {
        setInitialLoading(true);
      }

      const [hourly, timeline] = await Promise.all([
        getHourlyWeather(undefined, debouncedHourRange),
        getWeatherTimeline(undefined, debouncedDayRange),
      ]);
      if (active) {
        setHourlyData(hourly);
        setTimelineData(timeline);
        setInitialLoading(false);
        setIsUpdating(false);
        hasLoadedRef.current = true;
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }).start();
      }
    };
    loadWeather();
    return () => {
      active = false;
    };
  }, [debouncedHourRange, debouncedDayRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    const [hourly, timeline] = await Promise.all([
      getHourlyWeather(undefined, debouncedHourRange),
      getWeatherTimeline(undefined, debouncedDayRange),
    ]);
    setHourlyData(hourly);
    setTimelineData(timeline);
    setRefreshing(false);
  };

  const getConditionMeta = (condition: string) => {
    switch (condition) {
      case 'Sunny':
        return { Icon: Sun, accent: '#F59E0B' };
      case 'Light Rain':
        return { Icon: CloudRain, accent: '#60A5FA' };
      case 'Cloudy':
        return { Icon: Cloud, accent: '#E2E8F0' };
      case 'Clear Sky':
        return { Icon: CloudSun, accent: '#34D399' };
      default:
        return { Icon: Cloud, accent: '#E2E8F0' };
    }
  };

  const currentHourly = hourlyData?.hourly_forecast?.[0];
  const currentMeta = getConditionMeta(currentHourly?.condition || 'Cloudy');
  const CurrentIcon = currentMeta.Icon;
  const locationName = hourlyData?.location || timelineData?.location || 'Location';

  const aqiScore = Math.max(15, Math.min(90, Math.round((currentHourly?.humidity ?? 55) * 0.6 + 8)));
  const aqiLabel = aqiScore < 45 ? 'Good' : aqiScore < 70 ? 'Moderate' : 'Poor';
  const aqiColor = aqiScore < 45 ? 'text-emerald-500' : aqiScore < 70 ? 'text-amber-400' : 'text-rose-500';

  if (initialLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center gap-3">
        <Spinner size={36} />
        <Text variant="muted" className="text-sm">Loading hourly weather...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#4A90E2] dark:bg-[#1A365D] relative overflow-hidden">
      {/* Decorative Sky Glow Circles */}
      <View className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-yellow-200/20" />
      <View className="absolute top-28 -left-12 w-48 h-48 rounded-full bg-blue-300/15" />

      <Stack.Screen
        options={{
          title: locationName ? `Weather (${locationName})` : 'Weather',
          headerRight: () =>
            isUpdating ? <Spinner size={18} /> : null,
        }}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ResponsiveContainer>
          <ScrollView
            contentContainerClassName="p-5 pb-16 gap-5"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
              />
            }
          >
            {/* Hero Card */}
            <View className="rounded-3xl border border-white/25 bg-white/15 p-5 gap-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white/80 text-xs font-semibold">
                    {currentHourly?.time?.slice(0, 10) || 'Today'}
                  </Text>
                  <Text className="text-white text-7xl font-extrabold tracking-tighter leading-none mt-1">
                    {currentHourly?.temp_celsius || '--'}
                  </Text>
                  <Text className="text-white font-bold text-base mt-1">
                    {currentHourly?.condition || 'Loading...'}
                  </Text>
                </View>
                <Icon as={CurrentIcon} size={52} className="text-white" />
              </View>

              <View className="flex-row gap-5 pt-2 border-t border-white/15">
                <View className="flex-row items-center gap-1.5">
                  <Icon as={Droplets} size={15} className="text-white/80" />
                  <Text className="text-white/90 text-xs font-medium">
                    Humidity {currentHourly?.humidity ?? '--'}%
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Icon as={Wind} size={15} className="text-white/80" />
                  <Text className="text-white/90 text-xs font-medium">
                    Wind {currentHourly?.wind_speed_kmh ?? '--'} km/h
                  </Text>
                </View>
              </View>
            </View>

            {/* AQI Card */}
            <View className="flex-row items-center justify-between p-4 rounded-2xl border border-white/20 bg-white/10">
              <View className="gap-0.5">
                <Text className="text-white font-bold text-sm">Air Quality</Text>
                <Text className="text-white/70 text-xs">
                  {aqiLabel} for outdoor farm work.
                </Text>
              </View>
              <View className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-sm">
                <Text className={`font-black text-base ${aqiColor}`}>{aqiScore}</Text>
              </View>
            </View>

            {/* Hourly Forecast */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-bold text-base">Hourly Forecast</Text>
                <View className="flex-row gap-1.5">
                  {[24, 48, 72].map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => setHourRange(h as 24 | 48 | 72)}
                      className={`px-3 py-1 rounded-full border transition-all ${
                        hourRange === h
                          ? 'border-white bg-white/30'
                          : 'border-white/20 bg-white/10'
                      }`}
                    >
                      <Text className="text-white text-xs font-bold">{h}h</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2.5 py-1"
              >
                {(hourlyData?.hourly_forecast || []).slice(0, 16).map((item: any, idx: number) => {
                  const conditionMeta = getConditionMeta(item.condition);
                  const ConditionIcon = conditionMeta.Icon;
                  return (
                    <View
                      key={`${item.time}-${idx}`}
                      className="w-24 items-center gap-2 p-3 rounded-2xl border border-white/20 bg-white/15"
                    >
                      <Text className="text-white/80 text-xs">
                        {item.time?.slice(11) || item.time}
                      </Text>
                      <Icon as={ConditionIcon} size={20} className="text-white" />
                      <Text className="text-white font-bold text-sm">
                        {item.temp_celsius || `${item.temp}°C`}
                      </Text>
                      <Text className="text-white/70 text-[10px]">
                        Rain {item.rain_chance}%
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Daily Timeline */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-bold text-base">Daily Timeline</Text>
                <View className="flex-row gap-1.5">
                  {[7, 10, 14].map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setDayRange(d as 7 | 10 | 14)}
                      className={`px-3 py-1 rounded-full border transition-all ${
                        dayRange === d
                          ? 'border-white bg-white/30'
                          : 'border-white/20 bg-white/10'
                      }`}
                    >
                      <Text className="text-white text-xs font-bold">{d}d</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="gap-2.5">
                {(timelineData?.daily_forecast || []).map((day: any, idx: number) => {
                  const conditionMeta = getConditionMeta(day.condition);
                  const ConditionIcon = conditionMeta.Icon;
                  const min = Number(day.temp_min ?? 0);
                  const max = Number(day.temp_max ?? 0);
                  const barWidth = Math.min(220, Math.max(36, (max - min) * 14));

                  return (
                    <View
                      key={`${day.date}-${idx}`}
                      className="p-3.5 rounded-2xl border border-white/20 bg-white/15 gap-2.5"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-white font-bold text-sm">{day.date}</Text>
                        <View className="flex-row items-center gap-1.5">
                          <Icon as={ConditionIcon} size={16} className="text-white" />
                          <Text className="text-white/90 text-xs">{day.condition}</Text>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <Text className="text-white/75 text-xs">
                          Min {day.temp_min}°C / Max {day.temp_max}°C
                        </Text>
                        <Text className="text-white/75 text-xs">
                          Rain {day.rain_chance}%
                        </Text>
                      </View>

                      <View className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <View
                          className="h-full rounded-full bg-yellow-300"
                          style={{ width: barWidth }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </ResponsiveContainer>
      </Animated.View>
    </View>
  );
}
