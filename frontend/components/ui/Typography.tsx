import React, { useState, useEffect, useRef } from 'react';
import { Text, TextProps, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';
import { translationService } from '@/services/translation-service';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  /** Set to false to opt-out of translation (e.g. user names, numbers) */
  translate?: boolean;
}

/**
 * Hook that auto-translates a string:
 * 1. Checks i18next static locale first (instant)
 * 2. Falls back to dynamic MyMemory API (async, updates state when ready)
 * 3. Caches results for subsequent renders
 */
function useDynamicTranslate(text: string, shouldTranslate: boolean): string {
  const { t, i18n } = useTranslation();
  const { appLanguage } = useAppContext();
  const lang = i18n.language || appLanguage || 'English';

  // Static i18next result (instant, no network)
  const staticResult = shouldTranslate && lang !== 'English' ? t(text) : text;
  // If i18next returned a real translation (different from key), use it directly
  const hasStaticTranslation = staticResult !== text;

  // Check sync cache for a dynamic translation
  const cachedSync = shouldTranslate && !hasStaticTranslation && lang !== 'English'
    ? translationService.getCachedSync(text, lang)
    : null;

  const [dynTranslation, setDynTranslation] = useState<string | null>(
    cachedSync ?? (hasStaticTranslation ? staticResult : null)
  );

  const prevKey = useRef(`${lang}::${text}`);

  useEffect(() => {
    if (!shouldTranslate || lang === 'English' || !text?.trim()) {
      setDynTranslation(null);
      return;
    }

    const currentKey = `${lang}::${text}`;

    // Already have a static translation — no API call needed
    if (hasStaticTranslation) {
      setDynTranslation(staticResult);
      prevKey.current = currentKey;
      return;
    }

    // Check memory cache synchronously first
    const cached = translationService.getCachedSync(text, lang);
    if (cached) {
      setDynTranslation(cached);
      prevKey.current = currentKey;
      return;
    }

    // Reset while we fetch
    setDynTranslation(null);
    prevKey.current = currentKey;

    let cancelled = false;
    translationService.translate(text, lang).then((translated) => {
      if (!cancelled && prevKey.current === currentKey) {
        setDynTranslation(translated !== text ? translated : null);
      }
    });

    return () => { cancelled = true; };
  }, [text, lang, shouldTranslate, hasStaticTranslation, staticResult]);

  if (!shouldTranslate || lang === 'English') return text;
  return dynTranslation ?? staticResult;
}

/**
 * Recursively translates string children.
 * Non-string children (elements, numbers) pass through unchanged.
 */
function useAutoTranslate(children: React.ReactNode, shouldTranslate: boolean = true): React.ReactNode {
  // Collect all string leaves to translate
  const strings: string[] = [];
  const collectStrings = (node: React.ReactNode) => {
    if (typeof node === 'string') strings.push(node);
    else if (Array.isArray(node)) node.forEach(collectStrings);
  };
  collectStrings(children);

  // Translate each string (hooks must be called at top level — we translate joined text)
  // For simplicity, if there's exactly one string child, translate it directly.
  // For mixed content (string + element), fall back to static i18next only.
  const { t, i18n } = useTranslation();
  const { appLanguage } = useAppContext();
  const lang = i18n.language || appLanguage || 'English';

  const singleString = strings.length === 1 ? strings[0] : null;
  const dynamicResult = useDynamicTranslate(singleString ?? '', shouldTranslate && singleString !== null);

  return React.useMemo(() => {
    if (!shouldTranslate) return children;
    if (lang === 'English') return children;

    const translateNode = (node: React.ReactNode): React.ReactNode => {
      if (typeof node === 'string') {
        if (singleString !== null) return dynamicResult; // use dynamic result for single strings
        // Multiple string nodes — use only static i18next
        const s = t(node);
        return s;
      }
      if (Array.isArray(node)) {
        return node.map((child, i) => {
          const r = translateNode(child);
          return React.isValidElement(r) ? React.cloneElement(r, { key: i } as any) : r;
        });
      }
      return node;
    };

    return translateNode(children);
  }, [children, dynamicResult, lang, shouldTranslate, singleString, t]);
}

// ── Typography Components ───────────────────────────────────────────

export const H1 = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.h1, { color: colors.foreground }, style]} {...props}>{content}</Text>;
};

export const H2 = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.h2, { color: colors.foreground }, style]} {...props}>{content}</Text>;
};

export const H3 = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.h3, { color: colors.foreground }, style]} {...props}>{content}</Text>;
};

export const H4 = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.h4, { color: colors.foreground }, style]} {...props}>{content}</Text>;
};

export const P = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.p, { color: colors.foreground }, style]} {...props}>{content}</Text>;
};

export const Lead = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.lead, { color: colors.mutedForeground }, style]} {...props}>{content}</Text>;
};

export const Large = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.large, { color: colors.foreground }, style]} {...props}>{content}</Text>;
};

export const Small = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.small, { color: colors.foreground }, style]} {...props}>{content}</Text>;
};

export const Muted = ({ children, style, translate, ...props }: TypographyProps) => {
  const { colors } = useTheme();
  const content = useAutoTranslate(children, translate);
  return <Text style={[styles.muted, { color: colors.mutedForeground }, style]} {...props}>{content}</Text>;
};

export const Typography = { H1, H2, H3, H4, P, Lead, Large, Small, Muted };

const styles = StyleSheet.create({
  h1: { fontSize: 30, fontWeight: '800', letterSpacing: -0.75, lineHeight: 36 },
  h2: {
    fontSize: 24, fontWeight: '600', letterSpacing: -0.5, lineHeight: 32,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8,
  },
  h3: { fontSize: 20, fontWeight: '600', letterSpacing: -0.25, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2, lineHeight: 24 },
  p: { fontSize: 16, lineHeight: 24 },
  lead: { fontSize: 20, lineHeight: 28 },
  large: { fontSize: 18, fontWeight: '600' },
  small: { fontSize: 14, fontWeight: '500', lineHeight: 14 },
  muted: { fontSize: 14, lineHeight: 14 },
});
