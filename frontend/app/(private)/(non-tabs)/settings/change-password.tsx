import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Save, Eye, EyeOff } from 'lucide-react-native';

import { Input } from '@/components/reusables/input';
import { Label } from '@/components/reusables/label';
import { Button } from '@/components/reusables/button';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useToast } from '@/components/Toast';

export default function ChangePasswordScreen() {
  const { toast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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
    <View className="flex-1 bg-background">
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 max-w-lg mx-auto w-full gap-6"
        >
          {/* Header illustration */}
          <View className="items-center mt-4 mb-2 gap-3">
            <View className="w-20 h-20 rounded-3xl bg-primary/10 items-center justify-center border border-primary/20">
              <Icon as={Lock} size={36} className="text-primary" />
            </View>
            <Text variant="muted" className="text-center text-sm px-6">
              Update your password regularly to keep your farming data secure.
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View className="gap-1.5">
              <Label nativeID="curr-pass">Current Password</Label>
              <Input
                aria-labelledby="curr-pass"
                placeholder="Enter current password"
                value={form.currentPassword}
                onChangeText={(t) => setForm({ ...form, currentPassword: t })}
                secureTextEntry={!showPass}
              />
            </View>

            <View className="gap-1.5">
              <Label nativeID="new-pass">New Password</Label>
              <Input
                aria-labelledby="new-pass"
                placeholder="Enter new password"
                value={form.newPassword}
                onChangeText={(t) => setForm({ ...form, newPassword: t })}
                secureTextEntry={!showPass}
              />
            </View>

            <View className="gap-1.5">
              <Label nativeID="conf-pass">Confirm New Password</Label>
              <Input
                aria-labelledby="conf-pass"
                placeholder="Repeat new password"
                value={form.confirmPassword}
                onChangeText={(t) => setForm({ ...form, confirmPassword: t })}
                secureTextEntry={!showPass}
              />
            </View>

            <Button
              variant="ghost"
              className="self-end flex-row items-center gap-2 h-9 px-3"
              onPress={() => setShowPass(!showPass)}
            >
              <Icon as={showPass ? EyeOff : Eye} size={16} className="text-primary" />
              <Text className="text-primary text-xs font-semibold">
                {showPass ? 'Hide' : 'Show'} Passwords
              </Text>
            </Button>

            <Button
              className="h-12 rounded-xl flex-row items-center justify-center gap-2 mt-4"
              onPress={handleSave}
            >
              <Icon as={Save} size={18} className="text-primary-foreground" />
              <Text className="text-primary-foreground font-bold text-base">Update Password</Text>
            </Button>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
