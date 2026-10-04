import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  User,
  MapPin,
  Sprout,
  Edit3,
  Globe,
  Tractor,
  Beaker,
  CircleDot,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card, CardContent } from '@/components/reusables/card';
import { Button } from '@/components/reusables/button';
import { Badge } from '@/components/reusables/badge';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Separator } from '@/components/reusables/separator';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileStr = await AsyncStorage.getItem('user_profile');
        if (profileStr) {
          setProfile(JSON.parse(profileStr));
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner size={36} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'Personal Details',
          headerRight: () => (
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-xl"
              onPress={() => router.push('/profile/edit-profile')}
            >
              <Icon as={Edit3} size={18} className="text-primary" />
            </Button>
          ),
        }}
      />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-6"
        >
          {/* Basic Information */}
          <DetailSection title="Basic Information" icon={User}>
            <Card className="p-0 border border-border bg-card">
              <CardContent className="p-4 gap-3">
                <InfoRow label="Full Name" value={profile?.name || 'Not set'} />
                <Separator />
                <InfoRow label="App Language" value={profile?.appLang || 'English'} />
              </CardContent>
            </Card>
          </DetailSection>

          {/* Farm Location */}
          <DetailSection title="Farm Location" icon={MapPin}>
            <Card className="p-0 border border-border bg-card">
              <CardContent className="p-4 gap-3">
                <InfoRow label="Village / Town" value={profile?.village || 'Not set'} icon={CircleDot} />
                <Separator />
                <InfoRow label="District" value={profile?.district || 'Not set'} icon={MapPin} />
                <Separator />
                <InfoRow label="State" value={profile?.state || 'Not set'} icon={Globe} />
              </CardContent>
            </Card>
          </DetailSection>

          {/* Agriculture Profile */}
          <DetailSection title="Agriculture Profile" icon={Tractor}>
            <Card className="p-0 border border-border bg-card">
              <CardContent className="p-4 gap-3">
                <InfoRow label="Primary Crops" value={profile?.crops || 'Not set'} icon={Sprout} />
                <Separator />
                <View className="flex-row items-center justify-between py-1">
                  <Text variant="muted" className="text-sm">Farming Stage</Text>
                  <Badge variant="secondary">
                    <Text className="text-xs font-semibold">{profile?.flow_stage || 'Land Preparation'}</Text>
                  </Badge>
                </View>
              </CardContent>
            </Card>
          </DetailSection>

          {/* Soil Health Data */}
          <DetailSection title="Soil Health Data" icon={Beaker}>
            <Card className="border border-border bg-card p-4">
              <CardContent className="p-0">
                <View className="flex-row flex-wrap justify-between gap-3">
                  <GridItem label="Nitrogen (N)" value={profile?.nitrogen} unit="mg/kg" />
                  <GridItem label="Phosphorus (P)" value={profile?.phosphorus} unit="mg/kg" />
                  <GridItem label="Potassium (K)" value={profile?.potassium} unit="mg/kg" />
                  <GridItem label="Soil pH" value={profile?.ph} unit="pH" />
                </View>
              </CardContent>
            </Card>
          </DetailSection>

          <Button
            className="h-12 rounded-xl flex-row items-center justify-center gap-2 mt-2"
            onPress={() => router.push('/profile/edit-profile')}
          >
            <Icon as={Edit3} size={18} className="text-primary-foreground" />
            <Text className="font-bold text-primary-foreground">Edit Details</Text>
          </Button>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}

const DetailSection = ({ title, icon: IconComponent, children }: any) => {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 ml-1">
        <Icon as={IconComponent} size={18} className="text-primary" />
        <Text variant="muted" className="text-xs font-bold uppercase tracking-wider">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
};

const InfoRow = ({ label, value, icon: IconComponent }: any) => {
  return (
    <View className="flex-row items-center justify-between py-1">
      <View className="flex-1 mr-2">
        <Text variant="muted" className="text-xs">{label}</Text>
        <Text className="font-semibold text-foreground text-sm mt-0.5">{value}</Text>
      </View>
      {IconComponent && (
        <Icon as={IconComponent} size={16} className="text-muted-foreground/60 shrink-0" />
      )}
    </View>
  );
};

const GridItem = ({ label, value, unit }: any) => {
  return (
    <View className="w-[47%] items-center p-3 rounded-xl bg-muted/40 border border-border/50">
      <Text variant="muted" className="text-xs text-center">{label}</Text>
      <Text variant="h3" className="font-bold text-foreground mt-1 text-center">
        {value || '--'}
      </Text>
      <Text variant="muted" className="text-[10px] text-center mt-0.5">{unit}</Text>
    </View>
  );
};
