import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: `${import.meta.env.BASE_URL}api`,
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(`${import.meta.env.BASE_URL}api/auth/refresh`, {}, { withCredentials: true });
        useAuthStore.getState().setToken(data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Same rule on session expiry: LGU users land back on their branded login.
        const state = useAuthStore.getState();
        const slug = state.user?.lgu?.slug ?? state.lastLguSlug;
        useAuthStore.getState().logout();
        window.location.href = `${import.meta.env.BASE_URL}${slug ? `${slug}/login` : ''}`;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
