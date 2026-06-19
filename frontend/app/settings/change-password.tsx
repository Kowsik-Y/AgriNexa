import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Save, Eye, EyeOff } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/ui/Toast';

export default function ChangePasswordScreen() {
    const { colors } = useTheme();
    const { toast } = useToast();
    const router = useRouter();

    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPass, setShowPass] = useState(false);

    const handleSave = () => {
        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            toast({ title: 'Error', description: 'Please fill all fields', type: 'destructive' });
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            toast({ title: 'Error', description: 'New passwords do not match', type: 'destructive' });
            return;
        }

        if (form.newPassword.length < 6) {
            toast({ title: 'Error', description: 'Password must be at least 6 characters', type: 'destructive' });
            return;
        }

        toast({ title: 'Success', description: 'Password updated successfully', type: 'success' });
        router.back();
    };

    return (
        <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <ResponsiveContainer>
                <View style={styles.header}>
                    <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.foreground} />
                    </Button>
                    <Typography.H1 style={styles.title}>Change Password</Typography.H1>
                </View>

                <View style={styles.content}>
                    <View style={styles.illustration}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.tint + '10' }]}>
                            <Lock size={40} color={colors.tint} />
                        </View>
                        <Typography.P style={styles.desc}>
                            Update your password regularly to keep your farming data secure.
                        </Typography.P>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Current Password"
                            placeholder="Enter current password"
                            value={form.currentPassword}
                            onChangeText={(t) => setForm({ ...form, currentPassword: t })}
                            secureTextEntry={!showPass}
                        />

                        <Input
                            label="New Password"
                            placeholder="Enter new password"
                            value={form.newPassword}
                            onChangeText={(t) => setForm({ ...form, newPassword: t })}
                            secureTextEntry={!showPass}
                        />

                        <Input
                            label="Confirm New Password"
                            placeholder="Repeat new password"
                            value={form.confirmPassword}
                            onChangeText={(t) => setForm({ ...form, confirmPassword: t })}
                            secureTextEntry={!showPass}
                        />

                        <Button
                            variant="ghost"
                            style={styles.showBtn}
                            onPress={() => setShowPass(!showPass)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {showPass ? <EyeOff size={18} color={colors.tint} /> : <Eye size={18} color={colors.tint} />}
                                <Typography.Small style={{ color: colors.tint }}>{showPass ? 'Hide' : 'Show'} Passwords</Typography.Small>
                            </View>
                        </Button>

                        <Button style={styles.saveBtn} onPress={handleSave}>
                            <Save size={20} color={colors.primaryForeground} />
                            <Typography.Large style={{ color: colors.primaryForeground, fontWeight: '700' }}>Update Password</Typography.Large>
                        </Button>
                    </View>
                </View>
            </ResponsiveContainer>
        </KeyboardResponsiveView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20, gap: 12 },
    backBtn: { width: 44, height: 44 },
    title: { letterSpacing: -1 },
    content: { paddingHorizontal: 24, flex: 1 },
    illustration: { alignItems: 'center', marginTop: 24, marginBottom: 40, gap: 16 },
    iconCircle: { width: 80, height: 80, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    desc: { textAlign: 'center', opacity: 0.7, paddingHorizontal: 20 },
    form: { gap: 20 },
    showBtn: { alignSelf: 'flex-end', height: 32 },
    saveBtn: { marginTop: 20, height: 56, borderRadius: 18, gap: 12 },
});
