import { ref } from 'vue';
import api from '../utils/api';

export function useFileNumbers() {
  const fileNumbers = ref([]);
  const currentFileNumber = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchFileNumbersByPackage = async (packageId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/file-numbers/package/${packageId}`);
      fileNumbers.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchFileNumbersByClient = async (clientId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/file-numbers/client/${clientId}`);
      fileNumbers.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchFileNumberById = async (fileId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/file-numbers/${fileId}`);
      currentFileNumber.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createFileNumber = async (fileData) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.post('/file-numbers', fileData);
      fileNumbers.value.push(data);
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateFileNumber = async (fileId, updates) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.put(`/file-numbers/${fileId}`, updates);
      const index = fileNumbers.value.findIndex(f => f.fileId === fileId);
      if (index > -1) {
        fileNumbers.value[index] = data;
      }
      if (currentFileNumber.value?.fileId === fileId) {
        currentFileNumber.value = data;
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteFileNumber = async (fileId) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/file-numbers/${fileId}`);
      fileNumbers.value = fileNumbers.value.filter(f => f.fileId !== fileId);
      if (currentFileNumber.value?.fileId === fileId) {
        currentFileNumber.value = null;
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    fileNumbers,
    currentFileNumber,
    loading,
    error,
    fetchFileNumbersByPackage,
    fetchFileNumbersByClient,
    fetchFileNumberById,
    createFileNumber,
    updateFileNumber,
    deleteFileNumber,
  };
}
