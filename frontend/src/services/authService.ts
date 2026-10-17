import api from './api';
import { RegisterData } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const response = await api.post('/auth/change-password', { oldPassword, newPassword });
    return response.data;
  },

  googleLogin() {
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
    window.location.href = `${apiUrl}/auth/google`;
  },
};
