import axios from 'axios';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use environment variable for the API URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.87.60.107:8000';
// For Android emulator debugging, 10.0.2.2 usually maps to the host machine's localhost

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const sessionStr = await AsyncStorage.getItem('user_session');
  if (sessionStr) {
    const session = JSON.parse(sessionStr);
    if (session.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  }
  return config;
});

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (fn: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fn();
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        await AsyncStorage.removeItem('user_session');
      }
      const msg = err.response?.data?.detail || err.message || 'Network error';
      setError(msg);
      console.error('API Error:', msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (googleData: { user_id: string; email?: string; name?: string }) => {
    return await request(() => api.post('/auth/google', googleData));
  };

  const register = async (data: { email?: string; phone?: string; password: string; name?: string }) => {
    return await request(() => api.post('/auth/register', data));
  };

  const login = async (data: { email?: string; phone?: string; password: string }) => {
    return await request(() => api.post('/auth/login', data));
  };

  const getHomeData = async () => {
    try {
      const profileStr = await AsyncStorage.getItem('user_profile');
      const profile = profileStr ? JSON.parse(profileStr) : { district: 'Chennai' };
      const location = profile.district || 'Chennai';

      const weather = await request(() => api.get(`/weather?location=${location}`));
      const alerts = await request(() => api.get(`/pest-alert?location=${location}`));
      return { weather, alerts };
    } catch (e) {
      console.error('Home data error:', e);
      return { weather: null, alerts: null };
    }
  };

  const predictDisease = async (imageUri: string) => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: imageUri,
      name: 'crop.jpg',
      type: 'image/jpeg',
    });
    return await request(() => api.post('/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  };

  const voiceQuery = async (audioUri: string) => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: audioUri,
      name: 'voice.m4a',
      type: 'audio/m4a',
    });
    return await request(() => api.post('/voice-query', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  };

  const getPrices = async (crop: string = 'Rice') => {
    return await request(() => api.get(`/prices?crop=${crop}`));
  };

  const getAdvice = async () => {
    return await request(() => api.get('/advice'));
  };

  const saveProfileRemote = async (profile: any) => {
    try {
      return await request(() => api.post('/profile', profile));
    } catch (e) {
      console.error('Remote save failed:', e);
      return null;
    }
  };

  const getProfileRemote = async (userId: string) => {
    try {
      return await request(() => api.get(`/profile/${userId}`));
    } catch (e) {
      // 404 is expected for new users
      return null;
    }
  };

  return { 
    loading, 
    error, 
    getHomeData, 
    predictDisease, 
    voiceQuery, 
    getPrices, 
    getAdvice, 
    saveProfileRemote, 
    getProfileRemote,
    loginWithGoogle,
    register,
    login
  };
};
