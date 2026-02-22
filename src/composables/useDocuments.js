import { ref } from 'vue';
import api from '../utils/api';

export function useDocuments() {
  const documents = ref([]);
  const versions = ref({});
  const loading = ref(false);
  const error = ref(null);

  const fetchDocumentsByFileId = async (fileId) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/file-numbers/${fileId}/documents`);
      documents.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const uploadDocument = async ({ fileId, clientId, fileNumber, file }) => {
    // Don't use shared loading state to avoid conflicts with multiple uploads
    error.value = null;
    try {
      // Step 1: Get presigned URL for direct S3 upload
      const presignedData = await api.post(`/file-numbers/${fileId}/documents/presigned-url`, {
        fileName: file.name,
        contentType: file.type,
        clientId,
        fileNumber,
      });

      // Step 2: Upload directly to S3 using presigned URL
      const uploadResponse = await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Confirm upload with backend to create document metadata
      const data = await api.post(`/file-numbers/${fileId}/documents/confirm`, {
        fileName: presignedData.fileName,
        contentType: file.type,
        size: file.size,
        s3Key: presignedData.s3Key,
        clientId,
        fileNumber,
      });

      const index = documents.value.findIndex(doc => doc.documentId === data.documentId);
      if (index >= 0) {
        documents.value[index] = data;
      } else {
        documents.value.unshift(data);
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  const fetchDocumentVersions = async ({ fileId, documentId }) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get(`/file-numbers/${fileId}/documents/${documentId}/versions`);
      versions.value[documentId] = data.versions || [];
      return data.versions || [];
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteDocument = async ({ fileId, documentId }) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.delete(`/file-numbers/${fileId}/documents/${documentId}`);
      documents.value = documents.value.filter(doc => doc.documentId !== documentId);
      delete versions.value[documentId];
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const analyzeDocument = async ({ fileId, documentId }) => {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.post(`/file-numbers/${fileId}/documents/${documentId}/analyze`);
      // Update the document in the list with analysis data
      const index = documents.value.findIndex(doc => doc.documentId === documentId);
      if (index >= 0) {
        documents.value[index] = {
          ...documents.value[index],
          analysis: data.analysis,
          analyzedAt: data.analyzedAt,
        };
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchConversationHistory = async ({ fileId, documentId }) => {
    try {
      const data = await api.get(`/file-numbers/${fileId}/documents/${documentId}/conversation`);
      return data.conversationHistory || [];
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  const chatAboutDocument = async ({ fileId, documentId, message }) => {
    error.value = null;
    try {
      const data = await api.post(`/file-numbers/${fileId}/documents/${documentId}/chat`, {
        message,
      });
      // Update the document with conversation history
      const index = documents.value.findIndex(doc => doc.documentId === documentId);
      if (index >= 0) {
        documents.value[index] = {
          ...documents.value[index],
          conversationHistory: data.conversationHistory,
        };
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  return {
    documents,
    versions,
    loading,
    error,
    fetchDocumentsByFileId,
    uploadDocument,
    fetchDocumentVersions,
    deleteDocument,
    analyzeDocument,
    fetchConversationHistory,
    chatAboutDocument,
  };
}
