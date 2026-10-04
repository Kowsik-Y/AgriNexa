import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, BarChart3, Sprout, MessageSquare, Tractor } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Alert, AlertDescription, AlertTitle } from '@/components/reusables/alert';
import { Button } from '@/components/reusables/button';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/reusables/card';
import { useApi } from '@/hooks/use-api';
import { useAppContext } from '@/context/AppProvider';
import { useTranslation } from '@/hooks/use-translation';
import { MoreToolsSection } from '@/components/home/MoreToolsSection';
import { CropScanIcon } from '@/components/CropScanIcon';

const SectionLabel = ({ children }: { children: string }) => (
  <Text variant="muted" className="uppercase">{children}</Text>
);

const ActionCard = ({ icon, label, color, bg, onPress }: { icon: any; label: string; color: string; bg: string; onPress: () => void }) => (
  <Pressable onPress={onPress} className="min-w-[45%] flex-1">
    <Card className="items-center">
      <View className={`rounded-full p-3 ${bg}`}>
        <Icon as={icon} size={22} className={color} />
      </View>
      <Text>{label}</Text>
    </Card>
  </Pressable>
);

export default function HomeScreen() {
  const router = useRouter();
  const { appLanguage } = useAppContext();
  const { t } = useTranslation();
  const { getHomeData } = useApi();
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const profileStr = await AsyncStorage.getItem('user_profile');
      if (profileStr) setProfile(JSON.parse(profileStr));
      const homeData = await getHomeData();
      setData(homeData);
    };
    init();
  }, []);

  const isTamil = appLanguage === 'Tamil';
  const weather = data?.weather;
  const alerts = data?.alerts;
  const level = alerts?.alert_level;
  const tone =
    level === 'High'
      ? { card: 'border-destructive/30 bg-destructive/10', title: 'text-destructive', text: 'text-destructive/80', badge: '', badgeText: '' }
      : level === 'Medium'
        ? { card: 'border-amber-500/30 bg-amber-500/10', title: 'text-amber-700 dark:text-amber-300', text: 'text-amber-700/80 dark:text-amber-300/80', badge: 'bg-amber-500/15', badgeText: 'text-amber-600' }
        : { card: 'border-emerald-500/30 bg-emerald-500/10', title: 'text-emerald-700 dark:text-emerald-300', text: 'text-emerald-700/80 dark:text-emerald-300/80', badge: 'bg-emerald-500/15', badgeText: 'text-emerald-600' };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-5">
        <View>
          <Text variant="h3">{t('welcome', { name: profile?.name || t('farmer') })} 👋</Text>
          <Text variant="muted">{t('smartAssistant')}</Text>
        </View>

        <Pressable onPress={() => router.push('/weather-hourly')}>
          <Card className="border-sky-500/30 bg-sky-500/10">
            <CardHeader>
              <CardTitle className="text-sky-700 dark:text-sky-300">Weather</CardTitle>
              <CardDescription className="text-sky-600/80 dark:text-sky-300/80">
                {isTamil ? (weather?.tamil_condition || weather?.condition) : (weather?.condition ?? 'Loading...')}
                {` · Humidity ${weather?.humidity ?? '--'}%`}
              </CardDescription>
            </CardHeader>
            <CardContent className="items-center gap-3">
              <Text variant="h1" className="rounded-xl bg-sky-500/15 px-3 py-1 text-center text-sky-500">{weather?.temp ?? '--'}°C</Text>
              {weather?.advice ? (
                <Text variant="muted" className="text-center text-sky-700 dark:text-sky-200">{isTamil ? (weather.tamil_advice || weather.advice) : weather.advice}</Text>
              ) : null}
            </CardContent>
            <CardFooter className='mt-0 pt-0'>
              <Text variant="muted" className="text-sky-600/80 dark:text-sky-300/80">Tap to view hourly and full timeline weather</Text>
            </CardFooter>
          </Card>
        </Pressable>

        <View className={`overflow-hidden rounded-lg border ${tone.card}`}>
        <Alert
          icon={AlertTriangle}
          variant={level === 'High' ? 'destructive' : 'default'}
          className="border-0 bg-transparent"
          iconClassName={tone.title}>
          <AlertTitle className={tone.title}>
            {isTamil ? (alerts?.tamil_pest_type || alerts?.pest_type) : (alerts?.pest_type ?? t('Monitoring area...'))}
          </AlertTitle>
          <AlertDescription className={tone.text}>
            {`${t('riskLevel')}: ${t(level ?? 'Normal')}`}
          </AlertDescription>
        </Alert>
        </View>

        <SectionLabel>Tools</SectionLabel>
        <View className="flex-row flex-wrap gap-3">
          <ActionCard icon={CropScanIcon} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/15 dark:bg-emerald-500/25" label={t('cropScan')} onPress={() => router.push('/scan')} />
          <ActionCard icon={MessageSquare} color="text-violet-600 dark:text-violet-400" bg="bg-violet-500/15 dark:bg-violet-500/25" label={t('Assistant')} onPress={() => router.push('/assistant')} />
          <ActionCard icon={BarChart3} color="text-orange-600 dark:text-orange-400" bg="bg-orange-500/15 dark:bg-orange-500/25" label={t('marketPrices')} onPress={() => router.push('/prices')} />
          <ActionCard icon={Sprout} color="text-lime-600 dark:text-lime-400" bg="bg-lime-500/15 dark:bg-lime-500/25" label={t('cropAdvice')} onPress={() => router.push('/advice')} />
        </View>

        <MoreToolsSection marginBottom={0} items={[
          { label: 'Agri Flow', sub: 'Your farming roadmap', icon: Tractor, color: '#8B5CF6', route: '/agriflow' },
          { label: 'Reports', sub: 'Export & analytics', icon: BarChart3, color: '#F97316', route: '/reports' },
          { label: 'Daily Check', sub: 'Log daily health', icon: Sprout, color: '#10B981', route: '/daily-check' },
        ]} />
      </ScrollView>

      <Button size="icon" className="absolute bottom-5 right-5 rounded-full" onPress={() => router.push('/assistant')}>
        <Icon as={MessageSquare} size={20} className="text-primary-foreground" />
      </Button>
    </View>
  );
}
