import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { enqueue } from './offlineQueue.js';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Request interceptor — attach Idempotency-Key on every mutation
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = uuidv4();
    }
  }
  return config;
});

// Response interceptor for auth errors and offline queueing
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Auth redirect
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/') &&
      window.location.pathname !== '/login'
    ) {
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Offline queue — intercept network errors for mutations
    const method = error.config?.method?.toUpperCase();
    if (
      error.code === 'ERR_NETWORK' &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
      !error.config?.url?.includes('/auth/')
    ) {
      const fullUrl = (error.config.baseURL || '') + (error.config.url || '');
      await enqueue({
        method,
        url: fullUrl,
        data: error.config.data ? JSON.parse(error.config.data) : null,
        idempotencyKey: error.config.headers['Idempotency-Key'],
        label: `${method} ${error.config.url}`,
      });
      // Return a synthetic success so calling code can close the modal
      return { data: { queued: true }, status: 202, queued: true };
    }

    return Promise.reject(error);
  }
);

export default api;
