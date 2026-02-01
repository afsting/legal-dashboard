import { ref } from 'vue';
import api from '../utils/api';

export function useClients() {
  const clients = ref([]);
  const currentClient = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchClients = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get('/clients');
      clients.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchClientById = async (clientId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/clients/${clientId}`);
      currentClient.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createClient = async (clientData) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.post('/clients', clientData);
      clients.value.push(data);
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateClient = async (clientId, updates) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.put(`/clients/${clientId}`, updates);
      const index = clients.value.findIndex(c => c.clientId === clientId);
      if (index > -1) {
        clients.value[index] = data;
      }
      if (currentClient.value?.clientId === clientId) {
        currentClient.value = data;
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteClient = async (clientId) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/clients/${clientId}`);
      clients.value = clients.value.filter(c => c.clientId !== clientId);
      if (currentClient.value?.clientId === clientId) {
        currentClient.value = null;
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    clients,
    currentClient,
    loading,
    error,
    fetchClients,
    fetchClientById,
    createClient,
    updateClient,
    deleteClient,
  };
}
