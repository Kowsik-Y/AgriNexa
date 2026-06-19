import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { useTheme } from '@/hooks/use-theme';
import { ChevronRight } from 'lucide-react-native';

type IconType = any;

export type SettingsSectionRow = {
    icon: IconType;
    label: string;
    description?: string;
    color: string;
    kind?: 'action' | 'switch';
    value?: string;
    valueColor?: string;
    showChevron?: boolean;
    disabled?: boolean;
    onPress?: () => void;
    checked?: boolean;
    onCheckedChange?: (value: boolean, coords?: { x: number; y: number }) => void;
};

type SettingsSectionProps = {
    title: string;
    rows: SettingsSectionRow[];
};

export function SettingsSection({ title, rows }: SettingsSectionProps) {
    const { colors } = useTheme();

    return (
        <>
            <Typography.Small style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Typography.Small>
            <Card>
                <CardContent style={{ padding: 0 }}>
                    {rows.map((row, index) => (
                        <View key={`${row.label}-${index}`}>
                            {row.kind === 'switch' ? (
                                <SwitchRow {...row} />
                            ) : (
                                <ActionRow {...row} />
                            )}
                            {index < rows.length - 1 && <Separator />}
                        </View>
                    ))}
                </CardContent>
            </Card>
        </>
    );
}

function ActionRow(row: SettingsSectionRow) {
    const { colors } = useTheme();
    const Icon = row.icon;
    const showChevron = row.showChevron !== false;

    const content = (
        <>
            <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: row.color + '18' }]}>
                    <Icon size={18} color={row.color} />
                </View>
                <View style={styles.textWrap}>
                    <Typography.P style={{ fontWeight: '600', color: colors.foreground }}>{row.label}</Typography.P>
                    {row.description ? (
                        <Typography.Small style={{ color: colors.mutedForeground }}>{row.description}</Typography.Small>
                    ) : null}
                </View>
            </View>
            <View style={styles.rowRight}>
                {row.value ? (
                    <Typography.Small style={{ color: row.valueColor || colors.mutedForeground, fontWeight: row.valueColor ? '700' : '400' }}>
                        {row.value}
                    </Typography.Small>
                ) : null}
                {showChevron ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
            </View>
        </>
    );

    if (row.onPress) {
        return (
            <Button variant="ghost" style={[styles.row, row.disabled && styles.disabledRow]} onPress={row.onPress} disabled={row.disabled}>
                {content}
            </Button>
        );
    }

    return <View style={[styles.row, row.disabled && styles.disabledRow]}>{content}</View>;
}

function SwitchRow(row: SettingsSectionRow) {
    const { colors } = useTheme();
    const Icon = row.icon;

    return (
        <View style={[styles.row, styles.switchRow, row.disabled && styles.disabledRow]}>
            <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: row.color + '18' }]}>
                    <Icon size={18} color={row.color} />
                </View>
                <View style={styles.textWrap}>
                    <Typography.P style={{ fontWeight: '600', color: colors.foreground }}>{row.label}</Typography.P>
                    {row.description ? (
                        <Typography.Small style={{ color: colors.mutedForeground }}>{row.description}</Typography.Small>
                    ) : null}
                </View>
            </View>
            <Switch checked={!!row.checked} onCheckedChange={row.onCheckedChange} disabled={row.disabled} />
        </View>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginTop: 16,
        marginBottom: 4,
        marginLeft: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        height: 'auto',
    },
    switchRow: {
        paddingVertical: 14,
    },
    disabledRow: {
        opacity: 0.5,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    textWrap: {
        flex: 1,
        gap: 2,
    },
    rowIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
});
