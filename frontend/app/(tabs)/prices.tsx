import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, Pressable, Animated, Easing } from 'react-native';
import { TrendingUp, TrendingDown, MapPin, Calendar, RefreshCcw, Info } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';
import { getUserProfile } from '@/lib/auth-storage';

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
  const { colors } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Typography.H2 style={[styles.headerTitle, { color: colors.foreground, borderBottomWidth: 0 }]}>Market Prices</Typography.H2>
            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 2 }}>Live commodity rates</Typography.Small>
          </View>
          <Pressable onPress={() => fetchPrice(selectedCrop)} style={[styles.refreshBtn, { borderColor: colors.border }]}>
            <RefreshCcw size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* ── Crop Selector ── */}
      <View style={styles.selectorWrap}>
        <View style={styles.searchRow}>
          <Input
            value={cropSearch}
            onChangeText={setCropSearch}
            placeholder="Search crop (e.g., Rice)"
            returnKeyType="search"
            clearable
            onSubmitEditing={() => {
              const q = searchedCropName;
              if (!q) {
                return;
              }
              const customCrop = toTitleCase(q);
              selectCrop(customCrop);
            }}
            containerStyle={styles.searchInputWrap}
            style={[
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
            ]}
          />
          {searchedCropName.length > 1 && !hasExactPresetMatch ? (
            <Button
              onPress={() => {
                const customCrop = toTitleCase(searchedCropName);
                selectCrop(customCrop);
              }}
              variant="outline"
              size="sm"
              style={styles.searchApiButton}
            >
              Search
            </Button>
          ) : null}
        </View>
        <FlatList
          horizontal
          data={filteredCrops}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.selectorContent}
          renderItem={({ item }) => {
            const active = selectedCrop === item.name;
            return (
              <Pressable
                onPress={() => selectCrop(item.name)}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.foreground }
                    : { borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Typography.Small style={{ fontSize: 14 }}>{item.emoji}</Typography.Small>
                <Typography.Small style={{
                  color: active ? colors.background : colors.foreground,
                  fontWeight: '600',
                }}>{item.name}</Typography.Small>
              </Pressable>
            );
          }}
        />
        {filteredCrops.length === 0 ? (
          <View style={styles.noCropWrap}>
            <Typography.Small style={{ color: colors.mutedForeground, paddingTop: 8 }}>
              No crops found for "{searchedCropName}".
            </Typography.Small>
          </View>
        ) : null}
      </View>

      {/* ── Price ── */}
      {(loading || isPriceRefreshing) && !priceData ? (
        <View style={styles.center}>
          <Spinner size={28} color={colors.tint} />
          <Typography.P style={{ marginTop: 10, color: colors.mutedForeground }}>Fetching rates...</Typography.P>
        </View>
      ) : priceData ? (
        <View style={styles.priceArea}>
          <View style={[styles.card, { borderColor: colors.border }]}>
            <View style={styles.priceTop}>
              <View>
                {showTextSkeleton ? (
                  <Animated.View style={[styles.skeletonLine, styles.skeletonTitle, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
                ) : (
                  <Typography.P style={{ fontWeight: '700', color: colors.foreground }}>
                    {isTamil ? (priceData.tamil_crop || priceData.crop) : priceData.crop}
                  </Typography.P>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={12} color={colors.mutedForeground} />
                  {showTextSkeleton ? (
                    <Animated.View style={[styles.skeletonLine, styles.skeletonSubtitle, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
                  ) : (
                    <Typography.Small style={{ color: colors.mutedForeground }}>
                      {isTamil ? (priceData.tamil_market || priceData.market) : priceData.market}
                      {priceData?.state ? `, ${priceData.state}` : ''}
                    </Typography.Small>
                  )}
                </View>
              </View>
              <Badge variant={isUp ? 'default' : 'destructive'}>
                {isUp ? <TrendingUp size={12} color="#fff" /> : <TrendingDown size={12} color="#fff" />}
                {showTextSkeleton ? (
                  <Animated.View style={[styles.skeletonLine, styles.skeletonBadgeText, { backgroundColor: 'rgba(255,255,255,0.4)', opacity: skeletonOpacity }]} />
                ) : (
                  <Typography.Small style={{ color: '#fff', fontWeight: '700', marginLeft: 4 }}>
                    {priceData.trend}
                  </Typography.Small>
                )}
              </Badge>
            </View>

            <View style={[styles.priceDisplay, { backgroundColor: colors.muted }]}>
              <Typography.Small style={{ color: colors.mutedForeground, marginBottom: 4 }}>Current Rate</Typography.Small>

              <View style={styles.locationHeaderRow}>
                {showTextSkeleton ? (
                  <Animated.View style={[styles.skeletonLine, styles.skeletonLocation, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
                ) : (
                  <View>
                    <Typography.Small style={{ color: colors.mutedForeground }}>
                      Market: {resolvedLocationLabel}
                    </Typography.Small>
                    {locationMismatch ? (
                      <Typography.Small style={{ color: colors.mutedForeground }}>
                        Requested: {requestedLocationLabel}
                      </Typography.Small>
                    ) : null}
                  </View>
                )}
                <Button
                  onPress={() => setIsLocationEditorOpen((prev) => !prev)}
                  variant="outline"
                  size="sm"
                  style={styles.changeLocationButton}
                >
                  {isLocationEditorOpen ? 'Close' : 'Change'}
                </Button>
              </View>

              {isLocationEditorOpen ? (
                <View style={styles.locationEditor}>
                  <Input
                    value={stateName}
                    onChangeText={setStateName}
                    placeholder="State (e.g., Uttar Pradesh)"
                    autoCapitalize="words"
                    style={[
                      styles.locationInput,
                      { color: colors.foreground },
                    ]}
                  />
                  <Input
                    value={districtName}
                    onChangeText={setDistrictName}
                    placeholder="District (e.g., Bahraich)"
                    autoCapitalize="words"
                    style={[
                      styles.locationInput,
                      { color: colors.foreground },
                    ]}
                  />
                  <View style={styles.locationActionRow}>
                    <Button
                      onPress={() => {
                        setStateName('');
                        setDistrictName('');
                      }}
                      variant="outline"
                      style={styles.locationActionButton}
                    >
                      Clear
                    </Button>
                    <Button
                      onPress={applyLocationFilter}
                      variant="default"
                      style={styles.locationActionButton}
                    >
                      Apply
                    </Button>
                  </View>
                </View>
              ) : null}

              <View style={styles.unitSwitch}>
                <Button
                  onPress={() => setSelectedUnit('kg')}
                  variant={selectedUnit === 'kg' ? 'default' : 'outline'}
                  size="sm"
                  style={styles.unitButton}
                >
                  Per kg
                </Button>
                <Button
                  onPress={() => setSelectedUnit('quintal')}
                  variant={selectedUnit === 'quintal' ? 'default' : 'outline'}
                  size="sm"
                  style={styles.unitButton}
                >
                  Per quintal
                </Button>
              </View>

              <View style={styles.priceRow}>
                <Typography.H2 style={{ color: colors.foreground, fontSize: 20, borderBottomWidth: 0 }}>₹</Typography.H2>
                {showTextSkeleton ? (
                  <Animated.View style={[styles.skeletonLine, styles.skeletonPrice, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
                ) : (
                  <Typography.H1 style={[styles.priceVal, { color: colors.foreground }]}>{displayPriceValue}</Typography.H1>
                )}
                <Typography.Small style={{ color: colors.mutedForeground, alignSelf: 'flex-end', marginBottom: 6 }}>
                  /{displayUnit}
                </Typography.Small>
              </View>

              {!showTextSkeleton && !isDataAvailable ? (
                <Typography.Small style={{ color: colors.mutedForeground, marginTop: 6, textAlign: 'center' }}>
                  {priceData?.suggestion || 'This crop is not available in Data.gov for selected filters.'}
                </Typography.Small>
              ) : null}

              {hasDisplayPrice && !showTextSkeleton ? (
                <Typography.Small style={{ color: colors.mutedForeground, marginTop: 6 }}>
                  ₹ {pricePerKg.toFixed(2)} /kg • ₹ {pricePerQuintal.toFixed(2)} /quintal
                </Typography.Small>
              ) : null}
            </View>

            <View style={[styles.calculatorCard, { borderColor: colors.border }]}>
              <Typography.Small style={{ color: colors.mutedForeground, marginBottom: 8 }}>
                Cost Calculator
              </Typography.Small>
              <View style={styles.calculatorRow}>
                <Input
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  placeholder="Enter quantity"
                  clearable
                  style={[
                    styles.quantityInput,
                    { color: colors.foreground },
                  ]}
                />
                <Typography.Small style={{ color: colors.mutedForeground }}>
                  {selectedUnit}
                </Typography.Small>
              </View>
              <Typography.P style={{ color: colors.foreground, fontWeight: '700', marginTop: 8 }}>
                Total: ₹ {hasDisplayPrice && totalAmount > 0 ? totalAmount.toFixed(2) : '--'}
              </Typography.P>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Calendar size={12} color={colors.mutedForeground} />
                <Typography.Small style={{ color: colors.mutedForeground, marginLeft: 4 }}>Verified Today</Typography.Small>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Info size={32} color={colors.mutedForeground} />
          <Typography.P style={{ textAlign: 'center', marginTop: 10, color: colors.mutedForeground }}>
            No data available.
          </Typography.P>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  refreshBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selectorWrap: { paddingVertical: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
  },
  noCropWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 8,
  },
  searchApiButton: {
    minWidth: 88,
    marginTop: 2,
  },
  selectorContent: { paddingHorizontal: 20, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  priceArea: { flex: 1, paddingHorizontal: 20 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 14 },
  priceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  priceDisplay: { borderRadius: 10, padding: 16, alignItems: 'center' },
  locationHeaderRow: {
    width: '100%',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeLocationButton: {
    minWidth: 90,
  },
  locationEditor: {
    width: '100%',
    gap: 8,
    marginBottom: 10,
  },
  locationInput: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationActionButton: {
    flex: 1,
  },
  unitSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  unitButton: {
    minWidth: 132,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  priceVal: { fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  calculatorCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  calculatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonLine: {
    borderRadius: 6,
  },
  skeletonTitle: {
    height: 16,
    width: 130,
    marginBottom: 2,
  },
  skeletonSubtitle: {
    height: 12,
    width: 170,
  },
  skeletonBadgeText: {
    height: 10,
    width: 56,
    marginLeft: 4,
  },
  skeletonLocation: {
    height: 12,
    width: 190,
  },
  skeletonPrice: {
    height: 56,
    width: 190,
    marginBottom: 2,
  },
});
