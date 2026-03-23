import React from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export const Table = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  return (
    <ScrollView horizontal bounces={false}>
      <View style={[styles.table, style]}>{children}</View>
    </ScrollView>
  );
};

export const TableHeader = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  return <View style={[styles.header, { borderBottomColor: colors.border }, style]}>{children}</View>;
};

export const TableBody = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={style}>{children}</View>
);

export const TableFooter = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.footer, { backgroundColor: colors.muted, borderTopColor: colors.border }, style]}>
      {children}
    </View>
  );
};

export const TableRow = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  return <View style={[styles.row, { borderBottomColor: colors.border }, style]}>{children}</View>;
};

export const TableHead = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.cell, styles.head, style]}>
      <Text style={[styles.headText, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );
};

export const TableCell = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.cell, style]}>
      <Text style={[styles.cellText, { color: colors.foreground }]}>{children}</Text>
    </View>
  );
};

export const TableCaption = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.caption, { color: colors.mutedForeground }, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  table: {
    width: '100%',
    minWidth: 400,
  },
  header: {
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    fontWeight: '500',
  },
  cell: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  head: {
    height: 48,
  },
  headText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
  },
  cellText: {
    fontSize: 14,
    textAlign: 'left',
  },
  caption: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
