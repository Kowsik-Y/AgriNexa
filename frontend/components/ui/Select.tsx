import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Sheet, SheetHeader, SheetTitle, SheetContent } from './Sheet';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
}

export const Select = ({ value, onValueChange, placeholder = 'Select an option', children }: SelectProps) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  // Find the selected label
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<any>[];
  const selectedItem = items.find((item) => item.props.value === value);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.input, backgroundColor: colors.background }]}
      >
        <Text style={[styles.triggerText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {selectedItem ? (selectedItem.props as any).children : placeholder}
        </Text>
        <ChevronDown size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetHeader>
          <SheetTitle>{placeholder}</SheetTitle>
        </SheetHeader>
        <SheetContent>
          <ScrollView>
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                  onSelect: (val: string) => {
                    onValueChange?.(val);
                    setOpen(false);
                  },
                  isSelected: (child.props as any).value === value,
                } as any);
              }
              return child;
            })}
          </ScrollView>
        </SheetContent>
      </Sheet>
    </View>
  );
};

export const SelectItem = ({
  value,
  children,
  isSelected,
  onSelect,
}: {
  value: string;
  children: React.ReactNode;
  isSelected?: boolean;
  onSelect?: (value: string) => void;
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onSelect?.(value)}
      style={[styles.item, isSelected && { backgroundColor: colors.accent }]}
    >
      <Text style={[styles.itemText, { color: colors.foreground }]}>{children}</Text>
      {isSelected && <Check size={16} color={colors.primary} />}
    </TouchableOpacity>
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
});
