import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Pressable, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
  RefreshCcw,
  Info,
  Search,
  SlidersHorizontal,
  Calculator,
  Check,
  X,
  Minus,
} from 'lucide-react-native';

import { Badge } from '@/components/reusables/badge';
import { Spinner } from '@/components/Spinner';
import { Input } from '@/components/reusables/input';
import { Button } from '@/components/reusables/button';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/reusables/card';
import { useApi } from '@/hooks/use-api';
import { useAppContext } from '@/context/AppProvider';
import { getUserProfile } from '@/lib/auth-storage';
import { cn } from '@/lib/utils';

const CROPS = [
  { name: 'Rice', emoji: '🌾' },
  { name: 'Tomato', emoji: '🍅' },
  { name: 'Onion', emoji: '🧅' },
  { name: 'Corn', emoji: '🌽' },
  { name: 'Wheat', emoji: '🌿' },
  { name: 'Coconut', emoji: '🥥' },
  { name: 'Potato', emoji: '🥔' },
  { name: 'Cotton', emoji: '🧵' },
  { name: 'Jute', emoji: '🧶' },
  { name: 'Sugarcane', emoji: '🎋' },
  { name: 'Groundnut', emoji: '🥜' },
  { name: 'Soybean', emoji: '🫘' },
  { name: 'Chilli', emoji: '🌶️' },
  { name: 'Turmeric', emoji: '🟡' },
  { name: 'Banana', emoji: '🍌' },
  { name: 'Ginger', emoji: '🫚' },
  { name: 'Garlic', emoji: '🧄' },
];

export default function PricesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { getPrices, loading } = useApi();
  const { appLanguage } = useAppContext();
  const isTamil = appLanguage === 'Tamil';
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [cropSearch, setCropSearch] = useState('');
  const [priceData, setPriceData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'quintal'>('kg');
  const [quantity, setQuantity] = useState('1');
  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [isLocationEditorOpen, setIsLocationEditorOpen] = useState(false);
  const [isPriceRefreshing, setIsPriceRefreshing] = useState(false);
  const skeletonOpacity = useRef(new Animated.Value(1)).current;
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentRequestRef = useRef<{ key: string; ts: number } | null>(null);

  const scheduleFetch = (crop: string, delayMs: number = 180) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchPrice(crop);
    }, delayMs);
  };

  const selectCrop = (crop: string) => {
    if (selectedCrop === crop) {
      return;
    }
    setSelectedCrop(crop);
  };

  useEffect(() => {
    const loadDefaultLocation = async () => {
      const profile = await getUserProfile<any>();
      if (!profile) {
        return;
      }

      if (profile.state && !stateName) {
        setStateName(String(profile.state));
      }
      if (profile.district && !districtName) {
        setDistrictName(String(profile.district));
      }
    };

    loadDefaultLocation();
  }, []);

  useEffect(() => {
    scheduleFetch(selectedCrop, 180);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedCrop]);

  const fetchPrice = async (crop: string) => {
    const districtParam = districtName.trim() || '';
    const stateParam = stateName.trim() || '';
    const requestKey = `${crop}::${districtParam}::${stateParam}`;
    const now = Date.now();

    if (
      recentRequestRef.current &&
      recentRequestRef.current.key === requestKey &&
      now - recentRequestRef.current.ts < 1200
    ) {
      return;
    }

    if (inFlightRequestKeyRef.current === requestKey) {
      return;
    }

    recentRequestRef.current = { key: requestKey, ts: now };
    inFlightRequestKeyRef.current = requestKey;
    setIsPriceRefreshing(true);
    try {
      const res = await getPrices(crop, districtParam || undefined, stateParam || undefined);
      setPriceData(res);
    } finally {
      if (inFlightRequestKeyRef.current === requestKey) {
        inFlightRequestKeyRef.current = null;
      }
      setIsPriceRefreshing(false);
    }
  };

  const applyLocationFilter = async () => {
    scheduleFetch(selectedCrop, 80);
    setIsLocationEditorOpen(false);
  };

  const isUp =
    priceData?.trend === 'Up' ||
    priceData?.trend === 'Upward' ||
    priceData?.trend === 'Increasing';
  const isDown =
    priceData?.trend === 'Down' ||
    priceData?.trend === 'Downward' ||
    priceData?.trend === 'Decreasing';

  const toNumber = (value: any): number => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const pricePerKg = toNumber(priceData?.price_per_kg);
  const pricePerQuintal = toNumber(priceData?.price_per_quintal);
  const selectedPrice = selectedUnit === 'kg' ? pricePerKg : pricePerQuintal;
  const isDataAvailable = Boolean(priceData?.available);
  const hasDisplayPrice = selectedPrice > 0;

  const displayPriceValue = (() => {
    if (!hasDisplayPrice) {
      return '--';
    }
    return selectedPrice.toFixed(2);
  })();

  const displayUnit = selectedUnit;

  const quantityValue = (() => {
    const parsed = Number(quantity);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();

  const totalAmount = quantityValue * selectedPrice;
  const showTextSkeleton = isPriceRefreshing && !!priceData;
  const resolvedDistrict = String(priceData?.market || priceData?.details?.district || '').trim();
  const resolvedState = String(priceData?.state || priceData?.details?.state || '').trim();
  const requestedDistrict = districtName.trim();
  const requestedState = stateName.trim();
  const requestedLocationLabel = requestedDistrict || requestedState
    ? `${requestedDistrict || 'Any district'}${requestedState ? `, ${requestedState}` : ''}`
    : '';
  const resolvedLocationLabel = `${resolvedDistrict || 'Regional market'}${resolvedState ? `, ${resolvedState}` : ''}`;
  const locationMismatch = Boolean(
    requestedLocationLabel &&
    resolvedLocationLabel &&
    requestedLocationLabel.toLowerCase() !== resolvedLocationLabel.toLowerCase()
  );
  const filteredCrops = CROPS.filter((item) => {
    const q = cropSearch.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return item.name.toLowerCase().includes(q);
  });
  const searchedCropName = cropSearch.trim();
  const hasExactPresetMatch = CROPS.some(
    (item) => item.name.toLowerCase() === searchedCropName.toLowerCase()
  );

  const selectedCropEmoji =
    CROPS.find((item) => item.name.toLowerCase() === selectedCrop.toLowerCase())?.emoji || '🌾';

  const toTitleCase = (value: string): string => {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    if (!showTextSkeleton) {
      skeletonOpacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.45,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => {
      animation.stop();
      skeletonOpacity.setValue(1);
    };
  }, [showTextSkeleton, skeletonOpacity]);

  return (
    <View className="flex-1 bg-background">
      {/* ── Fixed Top Header & Commodity Filters (Mobile-Adaptive) ── */}
      <View
        className="bg-background/95 backdrop-blur-md sm:pt-4 border-b border-border/60 z-10 shadow-xs"
      >
        <View className="px-4 py-2 sm:px-6 sm:py-3 gap-1 sm:gap-2.5 max-w-4xl mx-auto w-full">
          {/* ── Screen Header Row ── */}
          <View className="flex-row items-center justify-between">
            <View className="ml-2">
              <Text className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Market Prices
              </Text>
              <Text variant="muted" className="text-xs sm:flex">
                Live commodity rates & market insights
              </Text>
            </View>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-border bg-card shadow-xs"
              onPress={() => fetchPrice(selectedCrop)}
              disabled={isPriceRefreshing}
            >
              {isPriceRefreshing ? (
                <Spinner size={15} />
              ) : (
                <Icon as={RefreshCcw} size={16} className="text-muted-foreground" />
              )}
            </Button>
          </View>

          {/* ── Search & Commodity Filters ── */}
          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <View className="relative flex-1 justify-center">
                <Input
                  value={cropSearch}
                  onChangeText={setCropSearch}
                  placeholder="Search commodity (e.g., Rice, Onion)..."
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    const q = searchedCropName;
                    if (!q) return;
                    const customCrop = toTitleCase(q);
                    selectCrop(customCrop);
                  }}
                  className="h-10 pr-9 text-xs sm:text-sm rounded-xl bg-card border-border/80"
                />
                {cropSearch ? (
                  <Pressable
                    onPress={() => setCropSearch('')}
                    hitSlop={8}
                    className="absolute right-2.5 p-1 rounded-full active:bg-muted"
                  >
                    <Icon as={X} size={15} className="text-muted-foreground" />
                  </Pressable>
                ) : (
                  <View className="absolute right-3 pointer-events-none">
                    <Icon as={Search} size={15} className="text-muted-foreground" />
                  </View>
                )}
              </View>
              {searchedCropName.length > 1 && !hasExactPresetMatch ? (
                <Button
                  onPress={() => {
                    const customCrop = toTitleCase(searchedCropName);
                    selectCrop(customCrop);
                  }}
                  variant="default"
                  size="sm"
                  className="h-10 px-3 rounded-xl shrink-0"
                >
                  <Text className="text-xs font-semibold text-primary-foreground">Search</Text>
                </Button>
              ) : null}
            </View>

            {/* Commodity Chips Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1.5 py-0.5"
            >
              {filteredCrops.map((item) => {
                const active = selectedCrop.toLowerCase() === item.name.toLowerCase();
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => selectCrop(item.name)}
                    className={cn(
                      'flex-row items-center gap-1.5 py-1.5 px-3 sm:px-3.5 sm:py-2 rounded-full border transition-all',
                      active
                        ? 'bg-primary border-primary shadow-xs'
                        : 'bg-card border-border/80 active:bg-muted'
                    )}
                  >
                    <Text className="text-xs sm:text-sm">{item.emoji}</Text>
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        active ? 'text-primary-foreground' : 'text-foreground'
                      )}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filteredCrops.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border p-3 items-center justify-center gap-1.5 bg-muted/20">
                <Text variant="muted" className="text-xs text-center">
                  No preset crop found for "{searchedCropName}".
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg"
                  onPress={() => {
                    const customCrop = toTitleCase(searchedCropName);
                    selectCrop(customCrop);
                  }}
                >
                  <Text className="text-xs">Fetch rates for "{searchedCropName}"</Text>
                </Button>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Scrollable Results Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-4 sm:p-6 gap-5 max-w-4xl mx-auto w-full"
      >
        {/* ── Main Rate Card ── */}
        {(loading || isPriceRefreshing) && !priceData ? (
          <View className="py-24 items-center justify-center gap-3">
            <Spinner size={32} />
            <Text variant="muted">Fetching latest mandi rates...</Text>
          </View>
        ) : priceData ? (
          <Card className="border-border/80 bg-card overflow-hidden">
            {/* Header info */}
            <CardHeader className="px-4 sm:px-6 flex-row items-start justify-between gap-2">
              <View className="flex-row items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-1">
                <View className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted/60 border border-border/60 items-center justify-center shrink-0">
                  <Text className="text-xl sm:text-2xl">{selectedCropEmoji}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  {showTextSkeleton ? (
                    <Animated.View
                      style={{ opacity: skeletonOpacity }}
                      className="h-5 sm:h-6 w-32 rounded-md bg-muted mb-1"
                    />
                  ) : (
                    <CardTitle className="text-lg sm:text-2xl font-bold tracking-tight" numberOfLines={1}>
                      {isTamil ? (priceData.tamil_crop || priceData.crop) : priceData.crop}
                    </CardTitle>
                  )}
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Icon as={MapPin} size={12} className="text-muted-foreground shrink-0" />
                    {showTextSkeleton ? (
                      <Animated.View
                        style={{ opacity: skeletonOpacity }}
                        className="h-3.5 w-36 rounded bg-muted"
                      />
                    ) : (
                      <CardDescription className="text-xs" numberOfLines={1}>
                        {isTamil ? (priceData.tamil_market || priceData.market) : priceData.market}
                        {priceData?.state ? `, ${priceData.state}` : ''}
                      </CardDescription>
                    )}
                  </View>
                </View>
              </View>

              {/* Trend Badge */}
              <View className="shrink-0">
                {isUp ? (
                  <Badge className="bg-emerald-500/15 border-emerald-500/30 gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1">
                    <Icon as={TrendingUp} size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {priceData.trend || 'Up'}
                    </Text>
                  </Badge>
                ) : isDown ? (
                  <Badge className="bg-rose-500/15 border-rose-500/30 gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1">
                    <Icon as={TrendingDown} size={12} className="text-rose-600 dark:text-rose-400" />
                    <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {priceData.trend || 'Down'}
                    </Text>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1">
                    <Icon as={Minus} size={12} className="text-muted-foreground" />
                    <Text className="text-xs font-bold text-muted-foreground">
                      {priceData.trend || 'Stable'}
                    </Text>
                  </Badge>
                )}
              </View>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 gap-4">
              {/* Highlighted Price Display Box */}
              <View className="rounded-2xl border border-border/60 bg-muted/30 p-4 sm:p-5 items-center justify-center gap-2.5">
                <Text variant="muted" className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold">
                  Current Modal Rate
                </Text>

                <View className="flex-row items-baseline gap-1 justify-center">
                  <Text className="text-xl sm:text-2xl font-bold text-muted-foreground">₹</Text>
                  {showTextSkeleton ? (
                    <Animated.View
                      style={{ opacity: skeletonOpacity }}
                      className="h-12 w-36 rounded-xl bg-muted"
                    />
                  ) : (
                    <Text className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                      {displayPriceValue}
                    </Text>
                  )}
                  <Text variant="muted" className="text-sm sm:text-base font-medium">
                    /{displayUnit}
                  </Text>
                </View>

                {/* Sub-rate pills */}
                {hasDisplayPrice && !showTextSkeleton ? (
                  <View className="flex-row flex-wrap items-center justify-center bg-card border border-border/60 rounded-full px-3 py-1 gap-1.5 sm:gap-2">
                    <Text className="text-[11px] sm:text-xs font-medium text-foreground">
                      ₹ {pricePerKg.toFixed(2)} /kg
                    </Text>
                    <Text className="text-xs text-muted-foreground">•</Text>
                    <Text className="text-[11px] sm:text-xs font-medium text-foreground">
                      ₹ {pricePerQuintal.toFixed(2)} /quintal
                    </Text>
                  </View>
                ) : null}

                {!showTextSkeleton && !isDataAvailable ? (
                  <Text variant="muted" className="text-xs text-center px-4">
                    {priceData?.suggestion || 'This commodity is not available in Mandi data for current filters.'}
                  </Text>
                ) : null}

                {/* Unit switcher */}
                <View className="flex-row items-center bg-card p-1 rounded-xl border border-border/60 gap-1 w-full max-w-xs justify-center mt-0.5">
                  <Button
                    onPress={() => setSelectedUnit('kg')}
                    variant={selectedUnit === 'kg' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1 rounded-lg h-8"
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        selectedUnit === 'kg' ? 'text-primary-foreground' : 'text-foreground'
                      )}
                    >
                      Per kg
                    </Text>
                  </Button>
                  <Button
                    onPress={() => setSelectedUnit('quintal')}
                    variant={selectedUnit === 'quintal' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1 rounded-lg h-8"
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        selectedUnit === 'quintal' ? 'text-primary-foreground' : 'text-foreground'
                      )}
                    >
                      Per quintal
                    </Text>
                  </Button>
                </View>
              </View>

              {/* Location Editor & Filter */}
              <View className="rounded-xl border border-border/60 bg-card p-3 sm:p-3.5 gap-2.5">
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-1 min-w-0 pr-1">
                    <Text className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Mandi Market Location
                    </Text>
                    <Text className="text-xs sm:text-sm font-semibold text-foreground mt-0.5" numberOfLines={1}>
                      {resolvedLocationLabel}
                    </Text>
                    {locationMismatch ? (
                      <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
                        Filtered by: {requestedLocationLabel}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    onPress={() => setIsLocationEditorOpen((prev) => !prev)}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 sm:px-3 rounded-lg border-border shrink-0"
                  >
                    <Icon as={SlidersHorizontal} size={12} className="text-muted-foreground mr-1" />
                    <Text className="text-xs font-medium">
                      {isLocationEditorOpen ? 'Close' : 'Change'}
                    </Text>
                  </Button>
                </View>

                {isLocationEditorOpen ? (
                  <View className="pt-2.5 border-t border-border/60 gap-2.5">
                    <View className="flex-col sm:flex-row gap-2">
                      <View className="flex-1">
                        <Text className="text-xs font-medium text-muted-foreground mb-1">State</Text>
                        <Input
                          value={stateName}
                          onChangeText={setStateName}
                          placeholder="e.g., Uttar Pradesh"
                          autoCapitalize="words"
                          className="h-9 text-xs"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-medium text-muted-foreground mb-1">District</Text>
                        <Input
                          value={districtName}
                          onChangeText={setDistrictName}
                          placeholder="e.g., Bahraich"
                          autoCapitalize="words"
                          className="h-9 text-xs"
                        />
                      </View>
                    </View>
                    <View className="flex-row justify-end gap-2 mt-0.5">
                      <Button
                        onPress={() => {
                          setStateName('');
                          setDistrictName('');
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3"
                      >
                        <Text className="text-xs">Clear</Text>
                      </Button>
                      <Button
                        onPress={applyLocationFilter}
                        variant="default"
                        size="sm"
                        className="h-8 px-4"
                      >
                        <Text className="text-xs font-semibold text-primary-foreground">Apply Filter</Text>
                      </Button>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Cost Estimator */}
              <View className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 gap-2.5">
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
                    <Icon as={Calculator} size={15} className="text-primary shrink-0" />
                    <Text className="text-xs sm:text-sm font-semibold text-foreground" numberOfLines={1}>
                      Estimated Revenue Calculator
                    </Text>
                  </View>
                  <Badge variant="outline" className="px-2 py-0.5 shrink-0">
                    <Text className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">{selectedUnit}</Text>
                  </Badge>
                </View>

                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <Input
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                      placeholder="Enter quantity"
                      className="h-10 text-xs sm:text-sm font-semibold"
                    />
                  </View>
                  <View className="px-3 py-2 bg-card rounded-xl border border-border/60 items-center justify-center min-w-[70px]">
                    <Text className="text-xs font-semibold text-foreground">{selectedUnit}</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between bg-card rounded-xl p-3 border border-border/60 gap-2">
                  <Text variant="muted" className="text-xs font-medium">
                    Calculated Total:
                  </Text>
                  <Text className="text-sm sm:text-base font-bold text-foreground text-right" numberOfLines={1}>
                    {hasDisplayPrice && totalAmount > 0
                      ? `₹ ${totalAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                      : '--'}
                  </Text>
                </View>
              </View>
            </CardContent>

            {/* Footer Verification */}
            <CardFooter className="border-t border-border/50 p-4 sm:p-6 pt-3 sm:pt-4 flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-1.5">
                <Icon as={Calendar} size={13} className="text-muted-foreground" />
                <Text variant="muted" className="text-xs">
                  Verified Today
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Icon as={Check} size={13} className="text-emerald-500" />
                <Text variant="muted" className="text-xs">
                  Government Mandi Feed
                </Text>
              </View>
            </CardFooter>
          </Card>
        ) : (
          <Card className="p-8 items-center justify-center gap-2 border-dashed border-border/80">
            <Icon as={Info} size={32} className="text-muted-foreground mb-1" />
            <Text className="font-semibold text-base text-foreground">No Rates Available</Text>
            <Text variant="muted" className="text-center text-xs max-w-sm">
              No price data returned for this commodity. Try clearing location filters or selecting another crop.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
