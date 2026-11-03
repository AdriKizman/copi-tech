import axios from 'axios';

axios.interceptors.request.use((config) => {
  if (typeof window === 'undefined' || typeof config.url !== 'string') {
    return config;
  }

  const url = new URL(config.url, window.location.origin);
  if (
    url.origin !== window.location.origin ||
    !/^\/api\/contratos(?:\/|$)/.test(url.pathname) ||
    url.pathname.startsWith('/api/contratos/publico/')
  ) {
    return config;
  }

  const token = window.localStorage.getItem('token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});
