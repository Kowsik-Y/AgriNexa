import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart3, Sprout, Tractor, LayoutGrid, ChevronRight } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/use-theme';

export type MoreToolsItem = {
    label: string;
    sub: string;
    icon: any;
    color: string;
    route: string;
};



type MoreToolsSectionProps = {
    label?: string;
    labelIcon?: any;
    labelColor?: string;
    items?: MoreToolsItem[];
    marginBottom?: number;
    onItemPress?: (item: MoreToolsItem) => void;
};

export function MoreToolsSection({
    label = 'More Tools',
    labelIcon: LabelIcon = LayoutGrid,
    labelColor,
    items = [],
    marginBottom = 110,
    onItemPress,
}: MoreToolsSectionProps) {
    const { colors } = useTheme();
    const router = useRouter();

    const resolvedLabelColor = labelColor || colors.mutedForeground;

    const handlePress = (item: MoreToolsItem) => {
        if (onItemPress) {
            onItemPress(item);
            return;
        }
        router.push(item.route as any);
    };

    return (
        <View style={[styles.section, { marginBottom }]}>
            <View style={styles.sectionLabel}>
                <LabelIcon size={16} color={resolvedLabelColor} />
                <Typography.Small style={[styles.sectionLabelText, { color: resolvedLabelColor }]}>{label.toUpperCase()}</Typography.Small>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
                {items.map((item, i, arr) => (
                    <Pressable
                        key={item.label}
                        onPress={() => handlePress(item)}
                        android_ripple={{
                            color: item.color + '24',
                            borderless: false,
                            foreground: true,
                        }}
                        style={({ pressed }) => [
                            styles.shortcutRow,
                            { borderBottomColor: colors.border },
                            pressed && styles.shortcutRowPressed,
                            i < arr.length - 1 && styles.shortcutBorder,
                        ]}
                    >
                        <View style={[styles.shortcutIcon, { backgroundColor: item.color + '18' }]}>
                            <item.icon size={20} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Typography.P style={{ fontWeight: '700', color: colors.foreground }}>{item.label}</Typography.P>
                            <Typography.Small style={{ color: colors.mutedForeground }}>{item.sub}</Typography.Small>
                        </View>
                        <ChevronRight size={18} color={colors.mutedForeground} />
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionLabelText: { fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },
    card: {
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 10,
        padding: 20,
        shadowColor: '#00000075',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
        overflow: 'hidden',
    },
    shortcutRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    shortcutRowPressed: { opacity: 0.86 },
    shortcutBorder: { borderBottomWidth: 1 },
    shortcutIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
