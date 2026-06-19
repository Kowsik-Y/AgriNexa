import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock3, Cloud, CloudRain, CloudSun, Droplets, Sun, Tractor, Wind } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/use-theme';
import { useApi } from '@/hooks/use-api';

export default function WeatherHourlyScreen() {
    const router = useRouter();
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
                return { Icon: Sun, accent: '#F59E0B', bg: '#F59E0B22' };
            case 'Light Rain':
                return { Icon: CloudRain, accent: '#2563EB', bg: '#2563EB22' };
            case 'Cloudy':
                return { Icon: Cloud, accent: '#64748B', bg: '#64748B22' };
            case 'Clear Sky':
                return { Icon: CloudSun, accent: '#10B981', bg: '#10B98122' };
            default:
                return { Icon: Cloud, accent: '#64748B', bg: '#64748B22' };
        }
    };

    const currentHourly = hourlyData?.hourly_forecast?.[0];
    const currentMeta = getConditionMeta(currentHourly?.condition || 'Cloudy');
    const CurrentIcon = currentMeta.Icon;
    const locationName = hourlyData?.location || timelineData?.location || 'Location';

    const aqiScore = Math.max(15, Math.min(90, Math.round((currentHourly?.humidity ?? 55) * 0.6 + 8)));
    const aqiLabel = aqiScore < 45 ? 'Good' : aqiScore < 70 ? 'Moderate' : 'Poor';
    const aqiColor = aqiScore < 45 ? '#22C55E' : aqiScore < 70 ? '#EAB308' : '#EF4444';

    if (initialLoading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.tint} />
                <Typography.P style={{ color: colors.mutedForeground, marginTop: 8 }}>Loading hourly weather...</Typography.P>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#5AA6FF' }]}>
            <View style={styles.skyGlowTop} />
            <View style={styles.skyGlowMid} />

            <View style={[styles.header, { borderBottomColor: '#FFFFFF44' }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={20} color="#FFFFFF" />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Typography.H3 style={{ color: '#FFFFFF', borderBottomWidth: 0 }}>Weather</Typography.H3>
                    <Typography.Small style={{ color: '#EAF4FF' }}>
                        {locationName}
                    </Typography.Small>
                </View>
                {isUpdating ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
            </View>

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
                >
                    <View style={styles.heroWrap}>
                        <View style={[styles.heroCard, { backgroundColor: '#FFFFFF1A', borderColor: '#FFFFFF3A' }]}>
                            <View style={styles.rowBetween}>
                                <View>
                                    <Typography.Small style={{ color: '#EAF4FF' }}>
                                        {currentHourly?.time?.slice(0, 10) || 'Today'}
                                    </Typography.Small>
                                    <Typography.H1 style={{ color: '#FFFFFF', borderBottomWidth: 0, fontSize: 78, lineHeight: 84 }}>
                                        {currentHourly?.temp_celsius || '--'}
                                    </Typography.H1>
                                    <Typography.P style={{ color: '#F5FAFF', fontWeight: '700' }}>
                                        {currentHourly?.condition || 'Loading...'}
                                    </Typography.P>
                                </View>
                                <CurrentIcon size={46} color="#FFFFFF" />
                            </View>
                            <View style={styles.heroMetaRow}>
                                <View style={styles.metaItem}>
                                    <Droplets size={14} color="#EAF4FF" />
                                    <Typography.Small style={{ color: '#EAF4FF' }}>
                                        Humidity {currentHourly?.humidity ?? '--'}%
                                    </Typography.Small>
                                </View>
                                <View style={styles.metaItem}>
                                    <Wind size={14} color="#EAF4FF" />
                                    <Typography.Small style={{ color: '#EAF4FF' }}>
                                        Wind {currentHourly?.wind_speed_kmh ?? '--'} km/h
                                    </Typography.Small>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.aqiCard}>
                        <View>
                            <Typography.P style={{ color: '#FFFFFF', fontWeight: '700' }}>Air Quality</Typography.P>
                            <Typography.Small style={{ color: '#DCEBFF', marginTop: 2 }}>{aqiLabel} for outdoor farm work.</Typography.Small>
                        </View>
                        <View style={styles.aqiBadge}>
                            <Typography.P style={{ color: aqiColor, fontWeight: '800' }}>{aqiScore}</Typography.P>
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Typography.P style={{ color: '#FFFFFF', fontWeight: '700' }}>Hourly Forecast</Typography.P>
                        <View style={styles.filterInlineRow}>
                            {[24, 48, 72].map((h) => (
                                <Pressable
                                    key={h}
                                    onPress={() => setHourRange(h as 24 | 48 | 72)}
                                    style={[
                                        styles.selectorPillCompact,
                                        { borderColor: '#FFFFFF4A', backgroundColor: hourRange === h ? '#0EA5E9' : '#FFFFFF1F' },
                                    ]}
                                >
                                    <Typography.Small style={{ color: '#FFFFFF', fontWeight: '700' }}>
                                        {h}h
                                    </Typography.Small>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyStrip}>
                        {(hourlyData?.hourly_forecast || []).slice(0, 16).map((item: any, idx: number) => {
                            const conditionMeta = getConditionMeta(item.condition);
                            const ConditionIcon = conditionMeta.Icon;
                            return (
                                <View
                                    key={`${item.time}-${idx}`}
                                    style={[
                                        styles.hourlyChip,
                                        {
                                            borderColor: '#FFFFFF3A',
                                            backgroundColor: '#FFFFFF1A',
                                        },
                                    ]}
                                >
                                    <Typography.Small style={{ color: '#EAF4FF' }}>{item.time?.slice(11) || item.time}</Typography.Small>
                                    <ConditionIcon size={18} color={conditionMeta.accent} />
                                    <Typography.P style={{ color: '#FFFFFF', fontWeight: '700' }}>{item.temp_celsius || `${item.temp}°C`}</Typography.P>
                                    <Typography.Small style={{ color: '#DCEBFF' }}>Rain {item.rain_chance}%</Typography.Small>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                        <Typography.P style={{ color: '#FFFFFF', fontWeight: '700' }}>Daily Timeline</Typography.P>
                        <View style={styles.filterInlineRow}>
                            {[7, 10, 14].map((d) => (
                                <Pressable
                                    key={d}
                                    onPress={() => setDayRange(d as 7 | 10 | 14)}
                                    style={[
                                        styles.selectorPillCompact,
                                        { borderColor: '#FFFFFF4A', backgroundColor: dayRange === d ? '#0EA5E9' : '#FFFFFF1F' },
                                    ]}
                                >
                                    <Typography.Small style={{ color: '#FFFFFF', fontWeight: '700' }}>
                                        {d}d
                                    </Typography.Small>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    {(timelineData?.daily_forecast || []).map((day: any, idx: number) => {
                        const conditionMeta = getConditionMeta(day.condition);
                        const ConditionIcon = conditionMeta.Icon;
                        const min = Number(day.temp_min ?? 0);
                        const max = Number(day.temp_max ?? 0);
                        const barWidth = Math.min(220, Math.max(36, (max - min) * 14));
                        return (
                            <View
                                key={`${day.date}-${idx}`}
                                style={[
                                    styles.dayCard,
                                    {
                                        borderColor: '#FFFFFF3A',
                                        backgroundColor: '#FFFFFF1A',
                                    },
                                ]}
                            >
                                <View style={styles.rowBetween}>
                                    <Typography.P style={{ color: '#FFFFFF', fontWeight: '700' }}>{day.date}</Typography.P>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <ConditionIcon size={16} color={conditionMeta.accent} />
                                        <Typography.Small style={{ color: '#F5FAFF' }}>{day.condition}</Typography.Small>
                                    </View>
                                </View>
                                <View style={styles.rowBetween}>
                                    <Typography.Small style={{ color: '#DCEBFF' }}>
                                        Min {day.temp_min}°C / Max {day.temp_max}°C
                                    </Typography.Small>
                                    <Typography.Small style={{ color: '#DCEBFF' }}>
                                        Rain {day.rain_chance}%
                                    </Typography.Small>
                                </View>
                                <View style={styles.tempBarTrack}>
                                    <View style={[styles.tempBarFill, { width: barWidth }]} />
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    skyGlowTop: {
        position: 'absolute',
        top: -30,
        right: -20,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#FFF4CC80',
    },
    skyGlowMid: {
        position: 'absolute',
        top: 120,
        left: -40,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#B2D6FF55',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 54,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        gap: 10,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroWrap: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    heroCard: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
        gap: 10,
    },
    heroMetaRow: {
        flexDirection: 'row',
        gap: 14,
        flexWrap: 'wrap',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 6,
    },
    filterInlineRow: {
        flexDirection: 'row',
        gap: 6,
    },
    selectorPillCompact: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    scroll: { padding: 16, paddingBottom: 30, gap: 12 },
    aqiCard: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF38',
        borderRadius: 18,
        backgroundColor: '#FFFFFF18',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    aqiBadge: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hourlyStrip: {
        gap: 10,
        paddingVertical: 6,
    },
    hourlyChip: {
        width: 98,
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 6,
    },
    dayCard: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
    },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tempBarTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: '#FFFFFF36',
        overflow: 'hidden',
    },
    tempBarFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: '#FACC15',
    },
});
