import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
    session: 'user_session',
    profile: 'user_profile',
    onboarded: 'onboarded',
} as const;

export type StoredSession = {
    id: string;
    method: string;
    token?: string;
};

async function safeGetJson<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<StoredSession | null> {
    return safeGetJson<StoredSession>(STORAGE_KEYS.session);
}

export async function setSession(session: StoredSession): Promise<void> {
    const data = JSON.stringify(session);
    await AsyncStorage.setItem(STORAGE_KEYS.session, data);
    // Verify it was saved
    const verify = await AsyncStorage.getItem(STORAGE_KEYS.session);
    if (verify !== data) {
        console.warn('[Storage] Session verification failed after save');
    } else {
        console.log('[Storage] Session saved successfully:', session.id, session.method);
    }
}

export async function getUserProfile<T = any>(): Promise<T | null> {
    return safeGetJson<T>(STORAGE_KEYS.profile);
}

export async function setUserProfile(profile: any): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export async function setOnboardedFlag(value: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.onboarded, value ? 'true' : 'false');
}

export async function getOnboardedFlag(): Promise<boolean> {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.onboarded);
    return value === 'true';
}

export async function clearAuthData(): Promise<void> {
    await AsyncStorage.multiRemove([
        STORAGE_KEYS.session,
        STORAGE_KEYS.profile,
        STORAGE_KEYS.onboarded,
    ]);
}

export async function getOrCreateSessionId(): Promise<string> {
    const existing = await getSession();
    if (existing?.id) return existing.id;

    const generatedId = `user_${Math.random().toString(36).slice(2, 11)}`;
    await setSession({ id: generatedId, method: 'local' });
    return generatedId;
}
