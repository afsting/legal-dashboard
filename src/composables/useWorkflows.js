import { ref } from 'vue';
import api from '../utils/api';

export function useWorkflows() {
  const workflows = ref([]);
  const currentWorkflow = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchWorkflowsByPackage = async (packageId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/workflows/package/${packageId}`);
      workflows.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchWorkflowById = async (workflowId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/workflows/${workflowId}`);
      currentWorkflow.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createWorkflow = async (workflowData) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.post('/workflows', workflowData);
      workflows.value.push(data);
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateWorkflow = async (workflowId, updates) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.put(`/workflows/${workflowId}`, updates);
      const index = workflows.value.findIndex(w => w.workflowId === workflowId);
      if (index > -1) {
        workflows.value[index] = data;
      }
      if (currentWorkflow.value?.workflowId === workflowId) {
        currentWorkflow.value = data;
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteWorkflow = async (workflowId) => {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/workflows/${workflowId}`);
      workflows.value = workflows.value.filter(w => w.workflowId !== workflowId);
      if (currentWorkflow.value?.workflowId === workflowId) {
        currentWorkflow.value = null;
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    workflows,
    currentWorkflow,
    loading,
    error,
    fetchWorkflowsByPackage,
    fetchWorkflowById,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
  };
}
