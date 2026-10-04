import React, { memo, useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Text } from '@/components/reusables/text';
import { useTheme } from '@/hooks/use-theme';

function getNodeText(node: any): string {
  if (!node) return '';
  let str = typeof node.content === 'string' ? node.content : '';
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      str += ' ' + getNodeText(child);
    }
  }
  return str.trim();
}

function getTableRows(tableNode: any): any[][] {
  const rows: any[][] = [];
  if (!tableNode || !Array.isArray(tableNode.children)) return rows;
  for (const section of tableNode.children) {
    if (section.type === 'tr') {
      rows.push(section.children || []);
    } else if (section.type === 'thead' || section.type === 'tbody') {
      if (Array.isArray(section.children)) {
        for (const tr of section.children) {
          if (tr && tr.type === 'tr') {
            rows.push(tr.children || []);
          }
        }
      }
    }
  }
  return rows;
}

function computeTableColumnWidths(tableNode: any): number[] {
  if (!tableNode) return [];
  if (tableNode._colWidths) return tableNode._colWidths;

  const rows = getTableRows(tableNode);
  let colCount = 0;
  for (const row of rows) {
    if (row.length > colCount) colCount = row.length;
  }
  if (colCount === 0) return [];

  const maxLens = new Array(colCount).fill(0);
  for (const row of rows) {
    for (let c = 0; c < colCount; c++) {
      const cell = row[c];
      const text = getNodeText(cell);
      if (text.length > maxLens[c]) {
        maxLens[c] = text.length;
      }
    }
  }

  const widths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    const maxL = maxLens[c];
    if (c === 0 && maxL <= 5) {
      widths.push(52);
    } else if (maxL <= 12) {
      widths.push(Math.max(90, Math.min(130, Math.round(maxL * 9.5))));
    } else if (maxL <= 30) {
      widths.push(Math.max(140, Math.min(200, Math.round(maxL * 6.5))));
    } else if (maxL <= 60) {
      widths.push(Math.max(180, Math.min(240, Math.round(maxL * 5.0))));
    } else {
      widths.push(260);
    }
  }

  const screenWidth = Dimensions.get('window').width;
  const minTableWidth = Math.max(screenWidth - 48, 320);
  const sumWidth = widths.reduce((a, b) => a + b, 0);
  if (sumWidth < minTableWidth && sumWidth > 0) {
    const scale = minTableWidth / sumWidth;
    for (let i = 0; i < widths.length; i++) {
      widths[i] = Math.round(widths[i] * scale);
    }
  }

  tableNode._colWidths = widths;
  return widths;
}

type Props = {
  content: string;
  isStreaming?: boolean;
};

export const MarkdownContent = memo(function MarkdownContent({
  content,
  isStreaming = false,
}: Props) {
  const { colors } = useTheme();

  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: colors.foreground,
          fontSize: 14,
          lineHeight: 22,
        },
        heading1: {
          color: colors.foreground,
          fontSize: 18,
          fontWeight: '700',
          marginTop: 10,
          marginBottom: 6,
        },
        heading2: {
          color: colors.primary,
          fontSize: 16,
          fontWeight: '700',
          marginTop: 8,
          marginBottom: 4,
        },
        heading3: {
          color: colors.foreground,
          fontSize: 14,
          fontWeight: '600',
          marginTop: 6,
          marginBottom: 4,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 6,
          color: colors.foreground,
          fontSize: 14,
          lineHeight: 21,
        },
        code_inline: {
          backgroundColor: colors.muted,
          color: colors.primary,
          borderRadius: 4,
          paddingHorizontal: 5,
          paddingVertical: 1,
          fontFamily: 'monospace',
          fontSize: 12,
        },
        code_block: {
          backgroundColor: colors.muted,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          fontFamily: 'monospace',
          marginVertical: 6,
        },
        fence: {
          backgroundColor: colors.muted,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          fontFamily: 'monospace',
          marginVertical: 6,
        },
        table: {
          borderWidth: 0,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          marginVertical: 8,
          borderRadius: 0,
        },
        thead: {
          borderBottomWidth: 1,
          borderBottomColor: `${colors.border}60`,
        },
        tbody: {
          borderWidth: 0,
        },
        tr: {
          borderBottomWidth: 1,
          borderColor: `${colors.border}25`,
          borderWidth: 0,
          flexDirection: 'row',
          alignItems: 'stretch',
        },
        th: {
          borderWidth: 0,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontWeight: '600',
          fontSize: 13,
          color: colors.mutedForeground,
          textAlign: 'left',
        },
        td: {
          borderWidth: 0,
          borderColor: 'transparent',
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 13,
          color: colors.foreground,
          textAlign: 'left',
        },
        blockquote: {
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
          backgroundColor: `${colors.primary}12`,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 4,
          marginVertical: 6,
        },
        bullet_list: {
          marginVertical: 4,
        },
        ordered_list: {
          marginVertical: 4,
        },
        list_item: {
          marginVertical: 2,
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        link: {
          color: colors.primary,
          textDecorationLine: 'underline',
        },
        hr: {
          backgroundColor: colors.border,
          height: 1,
          marginVertical: 12,
          width: '100%',
        },
      }),
    [colors]
  );

  const markdownRules = useMemo(
    () => ({
      hr: (node: any, children: any, parent: any, styles: any) => (
        <View
          key={node.key}
          style={[styles.hr, { backgroundColor: colors.border, height: 1, marginVertical: 12, width: '100%' }]}
        />
      ),
      table: (node: any, children: any, parent: any, styles: any) => {
        const colWidths = computeTableColumnWidths(node);
        const totalWidth = colWidths.reduce((a, b) => a + b, 0);

        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            key={node.key}
            contentContainerStyle={{ minWidth: '100%' }}
            className="my-2"
          >
            <View
              style={{
                minWidth: totalWidth > 0 ? totalWidth : '100%',
                width: totalWidth > 0 ? totalWidth : '100%',
              }}
            >
              {children}
            </View>
          </ScrollView>
        );
      },
      thead: (node: any, children: any, parent: any, styles: any) => (
        <View
          key={node.key}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: `${colors.border}60`,
          }}
        >
          {children}
        </View>
      ),
      tbody: (node: any, children: any, parent: any, styles: any) => (
        <View key={node.key} style={{ borderWidth: 0 }}>
          {children}
        </View>
      ),
      tr: (node: any, children: any, parentNodes: any, styles: any) => {
        const tableNode = Array.isArray(parentNodes)
          ? parentNodes.find((p: any) => p && p.type === 'table')
          : null;
        const colWidths = tableNode ? computeTableColumnWidths(tableNode) : [];
        const totalWidth = colWidths.reduce((a, b) => a + b, 0);

        return (
          <View
            key={node.key}
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              borderBottomWidth: 1,
              borderColor: `${colors.border}25`,
              minWidth: totalWidth > 0 ? totalWidth : '100%',
              width: totalWidth > 0 ? totalWidth : '100%',
            }}
          >
            {children}
          </View>
        );
      },
      th: (node: any, children: any, parentNodes: any, styles: any) => {
        const tableNode = Array.isArray(parentNodes)
          ? parentNodes.find((p: any) => p && p.type === 'table')
          : null;
        const colWidths = tableNode ? computeTableColumnWidths(tableNode) : [];
        const trNode = Array.isArray(parentNodes) ? parentNodes[0] : null;
        const colIndex =
          typeof node.index === 'number'
            ? node.index
            : trNode?.children?.indexOf(node) ?? 0;
        const colWidth = colWidths[colIndex] || 120;

        return (
          <View
            key={node.key}
            style={{
              width: colWidth,
              minWidth: colWidth,
              maxWidth: colWidth,
              paddingHorizontal: 10,
              paddingVertical: 8,
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            <Text
              style={{
                textAlign: 'left',
                fontWeight: '600',
                fontSize: 13,
                color: colors.mutedForeground,
                width: '100%',
              }}
            >
              {children}
            </Text>
          </View>
        );
      },
      td: (node: any, children: any, parentNodes: any, styles: any) => {
        const tableNode = Array.isArray(parentNodes)
          ? parentNodes.find((p: any) => p && p.type === 'table')
          : null;
        const colWidths = tableNode ? computeTableColumnWidths(tableNode) : [];
        const trNode = Array.isArray(parentNodes) ? parentNodes[0] : null;
        const colIndex =
          typeof node.index === 'number'
            ? node.index
            : trNode?.children?.indexOf(node) ?? 0;
        const colWidth = colWidths[colIndex] || 120;

        return (
          <View
            key={node.key}
            style={{
              width: colWidth,
              minWidth: colWidth,
              maxWidth: colWidth,
              paddingHorizontal: 10,
              paddingVertical: 8,
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            <Text
              style={{
                textAlign: 'left',
                fontSize: 13,
                color: colors.foreground,
                lineHeight: 19,
                width: '100%',
              }}
            >
              {children}
            </Text>
          </View>
        );
      },
    }),
    [colors]
  );

  if (!content) return null;

  return (
    <View className="w-full">
      <Markdown style={markdownStyles} rules={markdownRules}>
        {content}
      </Markdown>

      {isStreaming && (
        <View className="flex-row items-center gap-1.5 mt-1">
          <View className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <Text variant="muted" className="text-[11px] italic">
            Streaming agricultural advisory...
          </Text>
        </View>
      )}
    </View>
  );
});
