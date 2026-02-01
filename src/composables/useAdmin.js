import { ref } from 'vue';
import api from '../utils/api';

export function useAdmin() {
  const users = ref([]);
  const pendingUsers = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchAllUsers = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get('/auth/admin/users');
      users.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPendingUsers = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get('/auth/admin/pending-users');
      pendingUsers.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const approveUser = async (userId) => {
    loading.value = true;
    error.value = null;
    try {
      await api.post(`/auth/admin/approve/${userId}`);
      // Remove from pending list and add to users list
      const user = pendingUsers.value.find(u => u.userId === userId);
      if (user) {
        pendingUsers.value = pendingUsers.value.filter(u => u.userId !== userId);
        users.value.push({ ...user, approved: true });
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteUser = async (userId) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/auth/admin/users/${userId}`);
      // Remove from both lists
      users.value = users.value.filter(u => u.userId !== userId);
      pendingUsers.value = pendingUsers.value.filter(u => u.userId !== userId);
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateUserRole = async (userId, role) => {
    loading.value = true;
    error.value = null;
    try {
      await api.put(`/auth/admin/users/${userId}/role`, { role });
      // Update in users list
      const user = users.value.find(u => u.userId === userId);
      if (user) {
        user.role = role;
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    users,
    pendingUsers,
    loading,
    error,
    fetchAllUsers,
    fetchPendingUsers,
    approveUser,
    deleteUser,
    updateUserRole,
  };
}
