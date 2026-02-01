import { ref } from 'vue';
import api from '../utils/api';

export function useAuth() {
  const user = ref(null);
  const token = ref(localStorage.getItem('token'));
  const loading = ref(false);
  const error = ref(null);

  const register = async (email, password, name) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/register', { email, password, name });
      api.setToken(response.token);
      token.value = response.token;
      user.value = response.user;
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/login', { email, password });
      api.setToken(response.token);
      token.value = response.token;
      user.value = response.user;
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    api.setToken(null);
    token.value = null;
    user.value = null;
  };

  const isAuthenticated = () => !!token.value;

  return {
    user,
    token,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated,
  };
}
