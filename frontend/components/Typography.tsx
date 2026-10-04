import React, { useState, useEffect, useRef } from 'react';
import { TextProps, TextStyle, StyleProp } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text as RNRText } from '@/components/reusables/text';
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

export const H1 = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="h1" style={style} {...props}>{content}</RNRText>;
};

export const H2 = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="h2" style={style} {...props}>{content}</RNRText>;
};

export const H3 = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="h3" style={style} {...props}>{content}</RNRText>;
};

export const H4 = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="h4" style={style} {...props}>{content}</RNRText>;
};

export const P = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="p" style={style} {...props}>{content}</RNRText>;
};

export const Lead = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="lead" style={style} {...props}>{content}</RNRText>;
};

export const Large = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="large" style={style} {...props}>{content}</RNRText>;
};

export const Small = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="small" style={style} {...props}>{content}</RNRText>;
};

export const Muted = ({ children, style, translate, ...props }: TypographyProps) => {
  const content = useAutoTranslate(children, translate);
  return <RNRText variant="muted" style={style} {...props}>{content}</RNRText>;
};

export const Typography = { H1, H2, H3, H4, P, Lead, Large, Small, Muted };
