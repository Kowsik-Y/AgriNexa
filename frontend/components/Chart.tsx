import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface ChartProps {
  data: any[];
  labels?: string[];
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const LineChart = ({ data, labels, height = 200, style }: ChartProps) => {
  const { colors } = useTheme();
  const max = Math.max(...data);

  return (
    <View style={[styles.container, { height }, style]}>
      <View style={styles.chartArea}>
        {data.map((val, i) => (
          <View key={i} style={styles.pointContainer}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: colors.primary,
                  height: `${(val / max) * 100}%`,
                  width: 4,
                  borderRadius: 2,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels && (
        <View style={styles.labelArea}>
          {labels.map((label, i) => (
            <Text key={i} style={[styles.labelText, { color: colors.mutedForeground }]}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

export const BarChart = ({ data, labels, height = 200, style }: ChartProps) => {
  const { colors } = useTheme();
  const max = Math.max(...data);

  return (
    <View style={[styles.container, { height }, style]}>
      <View style={styles.chartArea}>
        {data.map((val, i) => (
          <View key={i} style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: colors.primary,
                  height: `${(val / max) * 100}%`,
                  borderRadius: 4,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels && (
        <View style={styles.labelArea}>
          {labels.map((label, i) => (
            <Text key={i} style={[styles.labelText, { color: colors.mutedForeground }]}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

export const AccordionChart = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.accordionChart}>{children}</View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  pointContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
  },
  labelArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  labelText: {
    fontSize: 10,
  },
  accordionChart: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    borderColor: '#e2e8f0',
  },
});
