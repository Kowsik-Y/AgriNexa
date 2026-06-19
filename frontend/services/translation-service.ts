/**
 * Dynamic Translation Service
 * Uses MyMemory free Translation API (no API key needed, 5000 words/day)
 * Caches results in memory + AsyncStorage for offline use
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'dyn_trans_v1_';
const API_URL = 'https://api.mymemory.translated.net/get';

export const LANG_CODES: Record<string, string> = {
  English: 'en',
  Tamil: 'ta',
  Hindi: 'hi',
  Malayalam: 'ml',
  Kannada: 'kn',
  Telugu: 'te',
};

type LangCache = Record<string, string>; // original -> translated

class TranslationService {
  /** In-memory cache: { lang -> { original -> translation } } */
  private memCache: Record<string, LangCache> = {};
  private cacheLoaded: Record<string, boolean> = {};
  private loadPromises: Record<string, Promise<void>> = {};
  /** In-flight network requests so we don't duplicate */
  private pending: Record<string, Promise<string>> = {};

  // ── Private helpers ──────────────────────────────────────────

  private cacheKey(text: string): string {
    return text.trim().toLowerCase();
  }

  private async ensureCacheLoaded(lang: string): Promise<void> {
    if (this.cacheLoaded[lang]) return;
    if (lang in this.loadPromises) return this.loadPromises[lang];

    this.loadPromises[lang] = (async () => {
      try {
        const stored = await AsyncStorage.getItem(`${CACHE_PREFIX}${lang}`);
        this.memCache[lang] = stored ? JSON.parse(stored) : {};
      } catch {
        this.memCache[lang] = {};
      }
      this.cacheLoaded[lang] = true;
    })();

    return this.loadPromises[lang];
  }

  private async saveCache(lang: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${lang}`,
        JSON.stringify(this.memCache[lang] || {})
      );
    } catch {
      // ignore storage errors
    }
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Returns a cached translation synchronously, or null if not yet cached.
   * Call this for instant render without waiting on network.
   */
  getCachedSync(text: string, lang: string): string | null {
    if (lang === 'English') return text;
    const key = this.cacheKey(text);
    return this.memCache[lang]?.[key] ?? null;
  }

  /**
   * Fully translates text to target language.
   * - Returns cached result instantly if available.
   * - Otherwise calls MyMemory API and caches the result.
   */
  async translate(text: string, lang: string): Promise<string> {
    // No-op for empty or English
    if (!text?.trim() || lang === 'English') return text;
    const langCode = LANG_CODES[lang];
    if (!langCode || langCode === 'en') return text;

    await this.ensureCacheLoaded(lang);

    const key = this.cacheKey(text);

    // Return cached result
    if (this.memCache[lang]?.[key]) {
      return this.memCache[lang][key];
    }

    // De-duplicate in-flight requests
    const pendingKey = `${lang}:${key}`;
    if (pendingKey in this.pending) {
      return this.pending[pendingKey];
    }

    this.pending[pendingKey] = (async (): Promise<string> => {
      try {
        const url = `${API_URL}?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated: string = data.responseData.translatedText;
          // Persist
          if (!this.memCache[lang]) this.memCache[lang] = {};
          this.memCache[lang][key] = translated;
          this.saveCache(lang); // no await — fire-and-forget
          return translated;
        }
      } catch {
        // Network / timeout — fall through to original
      } finally {
        delete this.pending[pendingKey];
      }
      return text;
    })();

    return this.pending[pendingKey];
  }

  /** Pre-warm cache for given language (call when language changes) */
  async preload(lang: string): Promise<void> {
    if (lang === 'English') return;
    await this.ensureCacheLoaded(lang);
  }

  /** Clear cached translations for a language */
  async clearCache(lang?: string): Promise<void> {
    if (lang) {
      delete this.memCache[lang];
      delete this.cacheLoaded[lang];
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${lang}`);
    } else {
      this.memCache = {};
      this.cacheLoaded = {};
    }
  }
}

export const translationService = new TranslationService();
