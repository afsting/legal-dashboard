<template>
  <div class="file-number-detail">
    <header class="navbar">
      <h1>File Number: {{ fileNumber?.fileNumber || 'Loading...' }}</h1>
      <router-link :to="{ name: 'ClientDetail', params: { clientId: $route.params.clientId } }" class="btn-secondary">Back to Client</router-link>
    </header>

    <main class="content">
      <div v-if="loading" class="loading-message">
        Loading file number details...
      </div>

      <div v-else-if="error || !fileNumber" class="error-message">
        File number not found
      </div>

      <div v-else class="file-info">
        <div class="file-header">
          <div>
            <h2>{{ fileNumber.fileNumber }}</h2>
            <p class="file-subtitle">{{ fileNumber.description || 'No description' }}</p>
            <p class="file-subtitle">Status: {{ fileNumber.status || 'active' }}</p>
          </div>
        </div>

        <div class="functions-section">
          <h3>Available Functions</h3>
          
          <div class="functions-grid">
            <!-- Demand Packages -->
            <router-link
              class="function-card"
              :to="{ name: 'DemandPackages', params: { clientId: $route.params.clientId, fileNumberId: $route.params.fileNumberId } }"
            >
              <div class="function-icon">📦</div>
              <h4>Demand Packages</h4>
              <p>Create and manage demand packages for this case</p>
              <div class="function-badge">Open</div>
            </router-link>

            <!-- Document Management -->
            <div class="function-card" @click="showDocuments = true">
              <div class="function-icon">📄</div>
              <h4>Document Management</h4>
              <p>Organize and manage case documents</p>
              <div class="function-count">{{ documents.length }} Files</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <div v-if="showDocuments" class="modal-overlay" @click="showDocuments = false">
    <div class="modal-content documents-modal" @click.stop>
      <div class="modal-header">
        <h2>Document Management</h2>
        <button class="btn-close" @click="showDocuments = false">✕</button>
      </div>

      <div
        class="dropzone"
        :class="{ active: isDragActive }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <input ref="fileInput" type="file" multiple class="file-input" @change="handleFileSelect" />
        <p>Drag and drop files here</p>
        <p class="muted">or</p>
        <button class="btn-secondary" type="button" @click="triggerFilePicker">Choose Files</button>
        <p v-if="selectedFiles.length > 0" class="selected-file">
          Selected: {{ selectedFiles.length }} file{{ selectedFiles.length > 1 ? 's' : '' }}
        </p>
      </div>

      <div class="upload-actions">
        <button class="btn-primary" @click="handleUpload" :disabled="selectedFiles.length === 0 || uploading">
          {{ uploading ? `Uploading... (${uploadProgress}/${selectedFiles.length})` : `Upload ${selectedFiles.length} Document${selectedFiles.length > 1 ? 's' : ''}` }}
        </button>
        <span v-if="uploadError" class="error-text">{{ uploadError }}</span>
      </div>

      <div v-if="documents.length === 0" class="empty-state">
        <p>No documents yet. Upload one to get started.</p>
      </div>

      <div v-else class="documents-list">
        <div class="list-controls">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search documents..." 
            class="search-input"
          />
          <select v-model="sortBy" class="sort-select">
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="date-newest">Newest First</option>
            <option value="date-oldest">Oldest First</option>
          </select>
        </div>

        <div class="list-header">
          <div class="col-name">Name</div>
          <div class="col-type">Type</div>
          <div class="col-size">Size</div>
          <div class="col-date">Uploaded</div>
          <div class="col-actions">Actions</div>
        </div>

        <div v-if="filteredDocuments.length === 0" class="no-results">
          <p>No documents match your search.</p>
        </div>

        <div v-for="doc in filteredDocuments" :key="doc.documentId" class="list-row">
          <div class="col-name">{{ doc.fileName }}</div>
          <div class="col-type">{{ doc.contentType }}</div>
          <div class="col-size">{{ formatSize(doc.size) }}</div>
          <div class="col-date">{{ formatDate(doc.createdAt) }}</div>
          <div class="col-actions">
            <button class="btn-link" @click="toggleVersions(doc)">
              {{ expandedVersions[doc.documentId] ? 'Hide Versions' : 'View Versions' }}
            </button>
            <button class="btn-link danger" @click="handleDelete(doc)">Delete</button>
          </div>

          <div v-if="expandedVersions[doc.documentId]" class="versions">
            <div v-if="!versions[doc.documentId]" class="loading-message">
              Loading versions...
            </div>
            <div v-else-if="versions[doc.documentId].length === 0" class="muted">
              No previous versions.
            </div>
            <div v-else class="versions-list">
              <div class="version-row" v-for="version in versions[doc.documentId]" :key="version.versionId">
                <span class="version-id">{{ version.versionId }}</span>
                <span class="version-date">{{ formatDate(version.lastModified) }}</span>
                <span class="version-size">{{ formatSize(version.size) }}</span>
                <span v-if="version.isLatest" class="badge-latest">Latest</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFileNumbers } from '../composables/useFileNumbers'
import { useDocuments } from '../composables/useDocuments'

const route = useRoute()
const { currentFileNumber, loading, error, fetchFileNumberById } = useFileNumbers()
const { documents, versions, fetchDocumentsByFileId, uploadDocument, fetchDocumentVersions, deleteDocument } = useDocuments()

const fileNumber = ref(null)
const selectedFiles = ref([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')
const showDocuments = ref(false)
const isDragActive = ref(false)
const fileInput = ref(null)
const expandedVersions = ref({})
const searchQuery = ref('')
const sortBy = ref('name-asc')

const filteredDocuments = computed(() => {
  let filtered = [...documents.value]
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(doc => 
      doc.fileName.toLowerCase().includes(query) ||
      doc.contentType.toLowerCase().includes(query)
    )
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc':
        return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })
      case 'name-desc':
        return b.fileName.localeCompare(a.fileName, undefined, { numeric: true, sensitivity: 'base' })
      case 'date-newest':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'date-oldest':
        return new Date(a.createdAt) - new Date(b.createdAt)
      default:
        return 0
    }
  })
  
  return filtered
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const formatSize = (size) => {
  if (!size) return '-'
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const filterValidFiles = (files) => {
  // Filter out directories - they typically have size 0 and empty type
  // or the File object might have specific properties
  return files.filter(file => {
    // Directories often have empty type and size 0, or have a '/' in the name path
    if (file.type === '' && file.size === 0) {
      return false // Likely a directory
    }
    return true // Valid file
  })
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || [])
  const validFiles = filterValidFiles(files)
  selectedFiles.value = validFiles
  
  if (validFiles.length < files.length) {
    uploadError.value = 'Folders cannot be uploaded. Please select files only.'
    setTimeout(() => uploadError.value = '', 3000)
  }
}

const triggerFilePicker = () => {
  fileInput.value?.click()
}

const handleDragOver = () => {
  isDragActive.value = true
}

const handleDragLeave = () => {
  isDragActive.value = false
}

const handleDrop = (event) => {
  isDragActive.value = false
  const files = Array.from(event.dataTransfer.files || [])
  const validFiles = filterValidFiles(files)
  selectedFiles.value = validFiles
  
  if (validFiles.length < files.length) {
    uploadError.value = 'Folders cannot be uploaded. Please select files only.'
    setTimeout(() => uploadError.value = '', 3000)
  }
}

const handleUpload = async () => {
  if (selectedFiles.value.length === 0 || !fileNumber.value) return
  uploadError.value = ''
  uploading.value = true
  uploadProgress.value = 0
  
  // Clone the files array to prevent issues with reactivity
  const filesToUpload = [...selectedFiles.value]
  
  try {
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      try {
        await uploadDocument({
          fileId: route.params.fileNumberId,
          clientId: route.params.clientId,
          fileNumber: fileNumber.value.fileNumber,
          file: file
        })
        uploadProgress.value = i + 1
        // Small delay between uploads to avoid overwhelming the API
        if (i < filesToUpload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err)
        uploadError.value = `Failed to upload ${file.name}: ${err.message}`
        // Continue with remaining files
      }
    }
    selectedFiles.value = []
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

const toggleVersions = async (doc) => {
  const isExpanded = expandedVersions.value[doc.documentId]
  if (isExpanded) {
    expandedVersions.value[doc.documentId] = false
    return
  }

  expandedVersions.value[doc.documentId] = true
  if (!versions.value[doc.documentId]) {
    await fetchDocumentVersions({
      fileId: route.params.fileNumberId,
      documentId: doc.documentId
    })
  }
}

const handleDelete = async (doc) => {
  if (!confirm(`Delete ${doc.fileName}? This can be restored later.`)) {
    return
  }

  await deleteDocument({
    fileId: route.params.fileNumberId,
    documentId: doc.documentId
  })
}

onMounted(async () => {
  try {
    const data = await fetchFileNumberById(route.params.fileNumberId)
    fileNumber.value = data
    await fetchDocumentsByFileId(route.params.fileNumberId)
  } catch (err) {
    console.error('Error fetching file number:', err)
  }
})
</script>

<style scoped>
.file-number-detail {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.navbar {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #5a6268;
}

.content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.error-message {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  color: #dc3545;
  text-align: center;
}

.loading-message {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  color: #666;
  text-align: center;
}

.file-info {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-header {
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #667eea;
}

.file-header h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.file-subtitle {
  margin: 0.25rem 0;
  color: #666;
  font-size: 14px;
}

.functions-section h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.functions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.function-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  text-decoration: none;
}

.function-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.function-card.disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.function-card.disabled:hover {
  transform: none;
  box-shadow: none;
}

.function-icon {
  font-size: 48px;
  margin-bottom: 1rem;
}

.function-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 20px;
}

.function-card p {
  margin: 0 0 1rem 0;
  opacity: 0.9;
  font-size: 14px;
}

.function-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  display: inline-block;
}

.function-badge {
  background: #ffc107;
  color: #333;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  display: inline-block;
  text-transform: uppercase;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  overflow: auto;
  padding: 2rem;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

.dropzone {
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  background: #f8fafc;
  transition: border 0.2s, background 0.2s;
}

.dropzone.active {
  border-color: #6366f1;
  background: #eef2ff;
}

.file-input {
  display: none;
}

.selected-file {
  margin-top: 0.75rem;
  font-weight: 600;
  color: #334155;
}

.muted {
  color: #6b7280;
  margin: 0.5rem 0;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
}

.documents-list {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.list-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
}

.sort-select {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #6366f1;
}

.list-header,
.list-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  align-items: center;
}

.list-header {
  font-weight: 600;
  color: #555;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #ddd;
  margin-bottom: 0.5rem;
}

.list-row {
  padding: 0.6rem 0;
  border-bottom: 1px solid #eee;
  color: #333;
}

.list-row:last-child {
  border-bottom: none;
}

.col-name {
  text-align: left;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.col-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-link {
  background: transparent;
  border: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}

.btn-link.danger {
  color: #dc2626;
}

.versions {
  grid-column: 1 / -1;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.version-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 1rem;
  align-items: center;
  font-size: 13px;
  color: #334155;
}

.badge-latest {
  background: #16a34a;
  color: white;
  font-size: 11px;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

.error-text {
  color: #dc3545;
  margin: 0.25rem 0;
}
</style>
