import axios from 'axios';
import { useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAuthData, getSession } from '@/lib/auth-storage';

// Use environment variable for the API URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.87.60.107:8000';
// For Android emulator debugging, 10.0.2.2 usually maps to the host machine's localhost

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (fn: () => Promise<any>, options?: { silent?: boolean; skipLoading?: boolean }) => {
    if (!options?.skipLoading) {
      setLoading(true);
    }
    if (!options?.silent) {
      setError(null);
    }
    try {
      const response = await fn();
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        await clearAuthData();
      }
      const detail = err.response?.data?.detail;
      let msg = 'Network error';

      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        // Pydantic V2 often returns [{msg: "..."}, ...]
        msg = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        msg = detail.msg || JSON.stringify(detail);
      } else {
        msg = err.message || msg;
      }

      if (!options?.silent) {
        setError(msg);
        console.warn('API Error:', msg);
      }
      return null;
    } finally {
      if (!options?.skipLoading) {
        setLoading(false);
      }
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

  const getHourlyWeather = async (location?: string, hours: number = 24) => {
    try {
      let resolvedLocation = location;
      if (!resolvedLocation) {
        const profileStr = await AsyncStorage.getItem('user_profile');
        const profile = profileStr ? JSON.parse(profileStr) : { district: 'Chennai' };
        resolvedLocation = profile.district || 'Chennai';
      }
      const safeLocation = resolvedLocation || 'Chennai';

      return await request(() =>
        api.get(`/weather/hourly?location=${encodeURIComponent(safeLocation)}&hours=${hours}`)
      );
    } catch (e) {
      console.error('Hourly weather error:', e);
      return null;
    }
  };

  const getWeatherTimeline = async (location?: string, days: number = 7) => {
    try {
      let resolvedLocation = location;
      if (!resolvedLocation) {
        const profileStr = await AsyncStorage.getItem('user_profile');
        const profile = profileStr ? JSON.parse(profileStr) : { district: 'Chennai' };
        resolvedLocation = profile.district || 'Chennai';
      }
      const safeLocation = resolvedLocation || 'Chennai';

      return await request(() =>
        api.get(`/weather/timeline?location=${encodeURIComponent(safeLocation)}&days=${days}`)
      );
    } catch (e) {
      console.error('Weather timeline error:', e);
      return null;
    }
  };

  const predictDisease = async (imageUri: string) => {
    return await uploadFile('/predict', imageUri, 'file', 'crop.jpg', 'image/jpeg');
  };

  const predictCrop = async (imageUri: string) => {
    return await uploadFile('/predict-crop', imageUri, 'file', 'crop.jpg', 'image/jpeg');
  };

  const voiceQuery = async (
    audioUri: string,
    options?: { conversationId?: string; language?: string }
  ) => {
    if (!options?.conversationId && !options?.language) {
      return await uploadFile('/voice-query', audioUri, 'file', 'voice.m4a', 'audio/m4a');
    }

    const formData = new FormData();
    if (Platform.OS === 'web') {
      const fileResponse = await fetch(audioUri);
      const fileBlob = await fileResponse.blob();
      formData.append('file', fileBlob, 'voice.m4a');
    } else {
      // @ts-ignore React Native fetch FormData file descriptor
      formData.append('file', {
        uri: audioUri,
        name: 'voice.m4a',
        type: 'audio/m4a',
      });
    }

    if (options.conversationId) {
      formData.append('conversation_id', options.conversationId);
    }
    if (options.language) {
      formData.append('language', options.language);
    }
    return uploadFormData('/voice-query', formData, 'POST');
  };

  const sendChatMessage = async (payload: {
    query: string;
    language: string;
    use_rag?: boolean;
    conversation_id?: string;
  }, options?: { silent?: boolean; skipLoading?: boolean }) => {
    return await request(() => api.post('/chat/messages', payload), options);
  };

  const getConversations = async (skip: number = 0, limit: number = 20) => {
    return await request(() => api.get('/chat/conversations', { params: { skip, limit } }));
  };

  const createConversation = async () => {
    return await request(() => api.post('/chat/conversations'));
  };

  const searchConversations = async (q: string, limit: number = 20) => {
    return await request(() => api.get('/chat/conversations/search', { params: { q, limit } }));
  };

  const getConversationMessages = async (
    conversationId: string,
    skip: number = 0,
    limit: number = 50,
    cursor?: string
  ) => {
    return await request(() =>
      api.get(`/chat/conversations/${conversationId}`, {
        params: { skip, limit, cursor },
      })
    );
  };

  const renameConversation = async (conversationId: string, title: string) => {
    return await request(() => api.patch(`/chat/conversations/${conversationId}`, { title }));
  };

  const deleteConversation = async (conversationId: string) => {
    return await request(() => api.delete(`/chat/conversations/${conversationId}`));
  };

  const getPrices = async (crop: string = 'Rice', district?: string, state?: string) => {
    return await request(() =>
      api.get('/prices', {
        params: {
          crop,
          ...(district ? { district } : {}),
          ...(state ? { state } : {}),
        },
      })
    );
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
      return await request(() => api.get(`/profile/${userId}`), { silent: true });
    } catch (e) {
      // 404 is expected for new users
      return null;
    }
  };

  const getLatestFarmingPlan = async () => {
    return await request(() => api.get('/agri-flow/latest'));
  };

  const createAgriFlowPlan = async (payload: {
    field_id?: string;
    field_name?: string;
    location: string;
    location_meta?: Record<string, any>;
    soil_type?: string;
    soil_input?: {
      nitrogen: number;
      phosphorus: number;
      potassium: number;
      ph: number;
      temperature: number;
      humidity: number;
    };
    crop?: string;
    irrigation_type?: string;
    planting_date?: string;
  }) => {
    return await request(() => api.post('/agri-flow/plans', payload));
  };

  const createAgriFlowPlansFromUserCrops = async () => {
    return await request(() => api.post('/agri-flow/plans/from-user-crops'));
  };

  const getActiveAgriFlowPlans = async () => {
    return await request(() => api.get('/agri-flow/plans/active'));
  };

  const getAgriFlowPlan = async (planId: string) => {
    return await request(() => api.get(`/agri-flow/plans/${planId}`));
  };

  const updateAgriFlowTask = async (
    taskId: string,
    payload: {
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
      note?: string;
      due_date?: string;
    }
  ) => {
    return await request(() => api.patch(`/agri-flow/tasks/${taskId}`, payload));
  };

  const recomputeAgriFlowPlan = async (
    planId: string,
    payload: {
      rain_probability?: number;
      heat_index?: number;
      humidity?: number;
      note?: string;
    }
  ) => {
    return await request(() => api.post(`/agri-flow/plans/${planId}/recompute`, payload));
  };

  const analyzeAgriFlowPhoto = async (
    params: {
      plan_id: string;
      crop: string;
      growth_stage_day: number;
      health_score?: number;
      notes?: string;
      temperature?: number;
      humidity?: number;
    },
    imageUri?: string
  ) => {
    const query = new URLSearchParams({
      plan_id: params.plan_id,
      crop: params.crop,
      growth_stage_day: String(params.growth_stage_day),
      ...(params.health_score != null ? { health_score: String(params.health_score) } : {}),
      ...(params.notes ? { notes: params.notes } : {}),
      ...(params.temperature != null ? { temperature: String(params.temperature) } : {}),
      ...(params.humidity != null ? { humidity: String(params.humidity) } : {}),
    }).toString();

    const endpoint = `/agri-flow/photos/analyze?${query}`;
    if (!imageUri) {
      return await request(() => api.post(endpoint));
    }
    return await uploadFile(endpoint, imageUri, 'file', 'crop.jpg', 'image/jpeg');
  };

  const getRequest = async (endpoint: string, params?: Record<string, any>) => {
    return await request(() => api.get(endpoint, { params }));
  };

  const postRequest = async (
    endpoint: string,
    data?: Record<string, any>,
    params?: Record<string, any>
  ) => {
    return await request(() => api.post(endpoint, data || {}, { params }));
  };

  // Supports both legacy signature and direct FormData uploads.
  const uploadFormData = async (
    endpoint: string,
    formData: FormData,
    method: 'POST' | 'PUT' = 'POST'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const sessionStr = await AsyncStorage.getItem('user_session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      const token = session?.token;

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        body: formData,
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        let msg = data.detail || 'Upload failed';
        if (Array.isArray(msg)) {
          msg = msg.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else if (typeof msg === 'object') {
          msg = msg.msg || JSON.stringify(msg);
        }
        throw new Error(msg);
      }
      return data;
    } catch (err: any) {
      if (err.message.includes('401')) {
        await clearAuthData();
      }
      setError(err.message);
      console.error(`Upload error (${endpoint}):`, err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadFileLegacy = async (
    endpoint: string,
    uri: string,
    fieldName: string,
    fileName: string,
    type: string
  ) => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web FormData requires a Blob/File, not a React Native descriptor object.
      const fileResponse = await fetch(uri);
      const fileBlob = await fileResponse.blob();
      formData.append(fieldName, fileBlob, fileName);
    } else {
      // @ts-ignore React Native fetch FormData file descriptor
      formData.append(fieldName, {
        uri,
        name: fileName,
        type,
      });
    }

    return uploadFormData(endpoint, formData, 'POST');
  };

  const uploadFile = async (
    endpoint: string,
    uriOrFormData: string | FormData,
    fieldName?: string,
    fileName?: string,
    type?: string
  ) => {
    if (typeof uriOrFormData === 'string') {
      if (!fieldName || !fileName || !type) {
        throw new Error('fieldName, fileName and type are required when uploading by URI.');
      }
      return uploadFileLegacy(endpoint, uriOrFormData, fieldName, fileName, type);
    }

    return uploadFormData(endpoint, uriOrFormData, 'POST');
  };

  const updateFarmingFlow = async (payload: {
    field_name: string;
    location: string;
    crop: string;
    flow_stage: string;
    growth_stage_day?: number;
    notes?: string;
  }) => {
    return await request(() => api.post('/agri-flow/update-flow', payload));
  };

  const testStageModel = async (payload: {
    crop: string;
    location?: string;
    growth_stage_day: number;
    health_score: number;
    temperature: number;
    humidity: number;
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    ph?: number;
  }) => {
    return await request(() => api.post('/agri-flow/stage-model/test', payload));
  };

  return {
    loading,
    error,
    getHomeData,
    getHourlyWeather,
    getWeatherTimeline,
    predictDisease,
    predictCrop,
    voiceQuery,
    sendChatMessage,
    createConversation,
    getConversations,
    searchConversations,
    getConversationMessages,
    renameConversation,
    deleteConversation,
    getPrices,
    getAdvice,
    saveProfileRemote,
    getProfileRemote,
    getLatestFarmingPlan,
    createAgriFlowPlan,
    createAgriFlowPlansFromUserCrops,
    getActiveAgriFlowPlans,
    getAgriFlowPlan,
    updateAgriFlowTask,
    recomputeAgriFlowPlan,
    analyzeAgriFlowPhoto,
    updateFarmingFlow,
    testStageModel,
    getRequest,
    postRequest,
    uploadFile,
    uploadFormData,
    loginWithGoogle,
    register,
    login
  };
};
