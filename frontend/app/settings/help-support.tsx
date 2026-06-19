import React from 'react';
import { StyleSheet, View, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
    ChevronLeft, MessageCircle, Mail, Phone,
    FileText, ExternalLink, HelpCircle, BookOpen
} from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';

export default function HelpSupportScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    const faqs = [
        { q: "How do I detect pests?", a: "Go to the Home tab and tap on 'Pest Detection'. Take a clear photo of the affected plant part." },
        { q: "Is AgriNexa free to use?", a: "Yes, the core features of AgriNexa are free for all farmers." },
        { q: "How do I change my village?", a: "Go to Profile -> Personal Details -> Edit to update your location." }
    ];

    return (
        <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <ResponsiveContainer>
                <View style={styles.header}>
                    <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.foreground} />
                    </Button>
                    <Typography.H1 style={styles.title}>Help & Support</Typography.H1>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                    <View style={styles.section}>
                        <Typography.Small style={styles.sectionTitle}>CONTACT US</Typography.Small>
                        <Card>
                            <CardContent style={{ padding: 0 }}>
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

                    <View style={styles.section}>
                        <Typography.Small style={styles.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Typography.Small>
                        {faqs.map((faq, index) => (
                            <Card key={index} style={{ marginBottom: 12 }}>
                                <CardContent style={{ padding: 20 }}>
                                    <Typography.P style={{ fontWeight: '700', marginBottom: 8 }}>{faq.q}</Typography.P>
                                    <Typography.Muted>{faq.a}</Typography.Muted>
                                </CardContent>
                            </Card>
                        ))}
                    </View>

                    <View style={styles.section}>
                        <Typography.Small style={styles.sectionTitle}>RESOURCES</Typography.Small>
                        <Card>
                            <CardContent style={{ padding: 0 }}>
                                <SupportItem icon={BookOpen} label="User Guide" desc="Learn how to use AgriNexa" />
                                <Separator />
                                <SupportItem icon={FileText} label="Terms of Service" desc="Read our legal terms" />
                                <Separator />
                                <SupportItem icon={ExternalLink} label="Official Website" desc="www.agrinexa.com" />
                            </CardContent>
                        </Card>
                    </View>

                    <View style={styles.footer}>
                        <HelpCircle size={32} color={colors.tint} opacity={0.5} />
                        <Typography.Muted style={{ textAlign: 'center' }}>
                            Our support team is available Mon-Sat, 9AM to 6PM IST.
                        </Typography.Muted>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </ResponsiveContainer>
        </KeyboardResponsiveView>
    );
}

const SupportItem = ({ icon: Icon, label, desc, onPress }: any) => {
    const { colors } = useTheme();
    return (
        <Button variant="ghost" style={styles.itemBtn} onPress={onPress}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.tint + '10' }]}>
                    <Icon size={20} color={colors.tint} />
                </View>
                <View>
                    <Typography.P style={{ fontWeight: '600' }}>{label}</Typography.P>
                    <Typography.Small style={{ color: colors.mutedForeground }}>{desc}</Typography.Small>
                </View>
            </View>
        </Button>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20, gap: 12 },
    backBtn: { width: 44, height: 44 },
    title: { letterSpacing: -1 },
    scrollBody: { paddingHorizontal: 20 },
    section: { marginTop: 24 },
    sectionTitle: { letterSpacing: 1.5, marginBottom: 12, marginLeft: 4, fontWeight: '800', opacity: 0.6 },
    itemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 18, paddingHorizontal: 16, height: 'auto' },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    footer: { marginTop: 40, alignItems: 'center', gap: 12, opacity: 0.7, paddingHorizontal: 40 },
});
