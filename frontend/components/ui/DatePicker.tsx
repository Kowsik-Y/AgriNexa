import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Sheet, SheetHeader, SheetTitle, SheetContent } from './Sheet';
import { Button } from './Button';

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date) => void;
  placeholder?: string;
}

export const DatePicker = ({ date, onDateChange, placeholder = 'Pick a date' }: DatePickerProps) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.input, backgroundColor: colors.background }]}
      >
        <Text style={[styles.triggerText, { color: date ? colors.foreground : colors.mutedForeground }]}>
          {date ? formatDate(date) : placeholder}
        </Text>
        <CalendarIcon size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetHeader>
          <SheetTitle>{placeholder}</SheetTitle>
        </SheetHeader>
        <SheetContent>
          <View style={styles.calendarPlaceholder}>
            <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
              Standard React Native DatePicker implementation would go here or a custom calendar view.
            </Text>
            <Button
              style={{ marginTop: 20 }}
              onPress={() => {
                onDateChange?.(new Date());
                setOpen(false);
              }}
            >
              Select Today
            </Button>
          </View>
        </SheetContent>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    height: 40,
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 14,
  },
  calendarPlaceholder: {
    padding: 20,
    alignItems: 'center',
  },
});
