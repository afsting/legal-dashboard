import { ref } from 'vue';
import api from '../utils/api';

export function usePackages() {
  const packages = ref([]);
  const currentPackage = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchPackagesByClient = async (clientId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/packages/client/${clientId}`);
      packages.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPackagesByFileNumber = async (fileNumberId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/packages/file-number/${fileNumberId}`);
      packages.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPackageById = async (packageId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/packages/${packageId}`);
      currentPackage.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createPackage = async (packageData) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.post('/packages', packageData);
      packages.value.push(data);
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePackage = async (packageId, updates) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.put(`/packages/${packageId}`, updates);
      const index = packages.value.findIndex(p => p.packageId === packageId);
      if (index > -1) {
        packages.value[index] = data;
      }
      if (currentPackage.value?.packageId === packageId) {
        currentPackage.value = data;
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deletePackage = async (packageId) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/packages/${packageId}`);
      packages.value = packages.value.filter(p => p.packageId !== packageId);
      if (currentPackage.value?.packageId === packageId) {
        currentPackage.value = null;
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    packages,
    currentPackage,
    loading,
    error,
    fetchPackagesByClient,
    fetchPackagesByFileNumber,
    fetchPackageById,
    createPackage,
    updatePackage,
    deletePackage,
  };
}
