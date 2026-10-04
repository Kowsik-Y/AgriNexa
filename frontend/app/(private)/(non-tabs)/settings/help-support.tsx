import React from 'react';
import { View, ScrollView, Linking, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import {
  MessageCircle,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  HelpCircle,
  BookOpen,
  ChevronRight,
} from 'lucide-react-native';

import { Card, CardContent } from '@/components/reusables/card';
import { Separator } from '@/components/reusables/separator';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

export default function HelpSupportScreen() {
  const faqs = [
    {
      q: 'How do I detect pests?',
      a: "Go to the Home tab and tap on 'Pest Detection'. Take a clear photo of the affected plant part.",
    },
    {
      q: 'Is AgriNexa free to use?',
      a: 'Yes, the core features of AgriNexa are free for all farmers.',
    },
    {
      q: 'How do I change my village?',
      a: 'Go to Profile -> Personal Details -> Edit to update your location.',
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-6"
        >
          {/* Contact Us */}
          <View className="gap-2">
            <Text variant="muted" className="text-xs font-bold uppercase tracking-wider ml-1">
              CONTACT US
            </Text>
            <Card className="p-0 border border-border bg-card overflow-hidden">
              <CardContent className="p-0">
                <SupportItem
                  icon={MessageCircle}
                  label="WhatsApp Support"
                  desc="Chat with our experts"
                  onPress={() => Linking.openURL('whatsapp://send?phone=919876543210')}
                />
                <Separator />
                <SupportItem
                  icon={Mail}
                  label="Email Support"
                  desc="support@agrinexa.com"
                  onPress={() => Linking.openURL('mailto:support@agrinexa.com')}
                />
                <Separator />
                <SupportItem
                  icon={Phone}
                  label="Call Helpline"
                  desc="Toll-free: 1800-123-456"
                  onPress={() => Linking.openURL('tel:1800123456')}
                />
              </CardContent>
            </Card>
          </View>

          {/* FAQs */}
          <View className="gap-2">
            <Text variant="muted" className="text-xs font-bold uppercase tracking-wider ml-1">
              FREQUENTLY ASKED QUESTIONS
            </Text>
            <View className="gap-3">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-4 border border-border bg-card">
                  <Text className="font-bold text-foreground text-sm mb-1.5">{faq.q}</Text>
                  <Text variant="muted" className="text-xs leading-relaxed">{faq.a}</Text>
                </Card>
              ))}
            </View>
          </View>

          {/* Resources */}
          <View className="gap-2">
            <Text variant="muted" className="text-xs font-bold uppercase tracking-wider ml-1">
              RESOURCES
            </Text>
            <Card className="p-0 border border-border bg-card overflow-hidden">
              <CardContent className="p-0">
                <SupportItem
                  icon={BookOpen}
                  label="User Guide"
                  desc="Learn how to use AgriNexa"
                />
                <Separator />
                <SupportItem
                  icon={FileText}
                  label="Terms of Service"
                  desc="Read our legal terms"
                />
                <Separator />
                <SupportItem
                  icon={ExternalLink}
                  label="Official Website"
                  desc="www.agrinexa.com"
                  onPress={() => Linking.openURL('https://agrinexa.com')}
                />
              </CardContent>
            </Card>
          </View>

          {/* Footer */}
          <View className="items-center gap-2 mt-4 px-6 opacity-70">
            <Icon as={HelpCircle} size={28} className="text-primary/70" />
            <Text variant="muted" className="text-xs text-center">
              Our support team is available Mon-Sat, 9AM to 6PM IST.
            </Text>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}

const SupportItem = ({
  icon: IconComponent,
  label,
  desc,
  onPress,
}: {
  icon: any;
  label: string;
  desc: string;
  onPress?: () => void;
}) => {
  return (
    <Pressable
      className="flex-row items-center justify-between px-4 py-3.5 active:bg-muted/40"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3.5 flex-1 pr-2">
        <View className="w-10 h-10 rounded-xl items-center justify-center bg-primary/10 shrink-0">
          <Icon as={IconComponent} size={18} className="text-primary" />
        </View>
        <View className="flex-1 justify-center gap-0.5">
          <Text className="font-semibold text-foreground text-sm">{label}</Text>
          <Text variant="muted" className="text-xs">{desc}</Text>
        </View>
      </View>
      <Icon as={ChevronRight} size={16} className="text-muted-foreground/60 shrink-0" />
    </Pressable>
  );
};
