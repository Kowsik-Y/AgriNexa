import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Search, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Sheet, SheetHeader, SheetTitle, SheetContent } from './Sheet';
import { Input } from './Input';

interface ComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  emptyText?: string;
}

export const Combobox = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select option...',
  emptyText = 'No result found.',
}: ComboboxProps) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.input, backgroundColor: colors.background }]}
      >
        <Text style={[styles.triggerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Search size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetHeader>
          <SheetTitle>{placeholder}</SheetTitle>
        </SheetHeader>
        <SheetContent>
          <Input
            placeholder="Search..."
            value={search}
            onChangeText={setSearch}
            containerStyle={styles.searchInput}
          />
          <ScrollView style={styles.list}>
            {filteredOptions.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>{emptyText}</Text>
            ) : (
              filteredOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onValueChange?.(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  style={[
                    styles.item,
                    value === option.value && { backgroundColor: colors.accent },
                  ]}
                >
                  <Text style={[styles.itemText, { color: colors.foreground }]}>
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Check size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
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
  searchInput: {
    marginBottom: 8,
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  itemText: {
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
});
