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
      const normalized = data.map((user) => {
        const groups = user.groups || [];
        const isAdmin = groups.includes('admin');
        return {
          ...user,
          groups,
          role: isAdmin ? 'admin' : 'user',
          approved: groups.includes('user') || isAdmin,
        };
      });
      users.value = normalized;
      return normalized;
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
      const normalized = data.map((user) => ({
        ...user,
        groups: user.groups || [],
        role: 'user',
        approved: false,
      }));
      pendingUsers.value = normalized;
      return normalized;
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
      // Approve user by adding them to the "user" group
      await api.post(`/auth/admin/users/${userId}/groups/user`);
      // Remove from pending list and add to users list
      const user = pendingUsers.value.find(u => u.userId === userId);
      if (user) {
        pendingUsers.value = pendingUsers.value.filter(u => u.userId !== userId);
        users.value.push({
          ...user,
          role: 'user',
          approved: true,
          groups: ['user'],
        });
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
      // Update role by managing group membership
      // First remove from current groups, then add to new one
      if (role === 'admin') {
        await assignUserToGroup(userId, 'admin');
      } else if (role === 'user') {
        await removeUserFromGroup(userId, 'admin');
        await assignUserToGroup(userId, 'user');
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const assignUserToGroup = async (userId, groupName) => {
    loading.value = true;
    error.value = null;
    try {
      await api.post(`/auth/admin/users/${userId}/groups/${groupName}`);
      // Update user's groups in list
      const user = users.value.find(u => u.userId === userId);
      if (user) {
        if (!user.groups) {
          user.groups = [];
        }
        if (!user.groups.includes(groupName)) {
          user.groups.push(groupName);
        }
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeUserFromGroup = async (userId, groupName) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/auth/admin/users/${userId}/groups/${groupName}`);
      // Update user's groups in list
      const user = users.value.find(u => u.userId === userId);
      if (user && user.groups) {
        user.groups = user.groups.filter(g => g !== groupName);
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const promoteToAdmin = async (userId) => {
    return assignUserToGroup(userId, 'admin');
  };

  const demoteFromAdmin = async (userId) => {
    return removeUserFromGroup(userId, 'admin');
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
    assignUserToGroup,
    removeUserFromGroup,
    promoteToAdmin,
    demoteFromAdmin,
  };
}
