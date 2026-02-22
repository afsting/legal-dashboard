<template>
  <div class="file-number-detail">
    <header class="navbar">
      <h1 class="page-title">
        <span>File Number: {{ fileNumber?.fileNumber || 'Loading...' }}</span>
        <span v-if="fileNumber" class="status-pill">{{ fileNumber.status || 'active' }}</span>
      </h1>
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
        <div class="matter-description">
          <div class="description-header">
            <h3>Description</h3>
            <button
              class="btn-primary"
              type="button"
              :disabled="!isDescriptionDirty || isSaving"
              @click="saveDescription"
            >
              {{ isSaving ? 'Saving...' : 'Save' }}
            </button>
          </div>
          <p class="description-hint">Describe the legal matter for this file number.</p>
          <textarea
            v-model="matterDescription"
            class="description-input"
            rows="4"
            placeholder="Add a brief description of the legal matter..."
          ></textarea>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </div>

        <div class="functions-section">
          <div class="functions-header">
            <h3>Demand Package</h3>
            <router-link
              class="btn-secondary btn-compact"
              :to="packageButtonRoute"
            >
              {{ packageButtonText }}
            </router-link>
          </div>
        </div>

        <div class="documents-section">
          <div class="documents-header">
            <h3>Documents</h3>
            <span class="documents-count">{{ documents.length }} Files</span>
          </div>

          <div v-if="documents.length === 0" class="empty-state">
            <p>No documents uploaded yet.</p>
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
              <div class="col-size">Size</div>
              <div class="col-date">Uploaded</div>
              <div class="col-action">Action</div>
            </div>

            <div v-if="filteredDocuments.length === 0" class="no-results">
              <p>No documents match your search.</p>
            </div>

            <div v-for="doc in paginatedDocuments" :key="doc.documentId" class="list-row">
              <div class="col-name">{{ doc.fileName }}</div>
              <div class="col-size">{{ formatSize(doc.size) }}</div>
              <div class="col-date">{{ formatDate(doc.createdAt) }}</div>
              <div class="col-action">
                <button
                  v-if="isAnalysisSupported(doc) && !doc.analysis"
                  class="btn-analyze"
                  :disabled="analyzingDocId === doc.documentId"
                  @click="analyzeDocument(doc)"
                >
                  {{ analyzingDocId === doc.documentId ? 'Analyzing...' : 'Analyze' }}
                </button>
                <button
                  v-else-if="doc.analysis"
                  class="btn-view"
                  @click="viewAnalysis(doc)"
                >
                  View
                </button>
                <span v-else class="unsupported-hint">Images require OCR</span>
              </div>
            </div>
            <div v-if="totalPages > 1" class="pagination">
              <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">← Prev</button>
              <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
              <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">Next →</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Analysis Modal -->
    <div v-if="showAnalysisModal" class="modal-overlay" @click="closeAnalysisModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Document Analysis & Chat</h2>
          <div class="modal-header-buttons">
            <button class="btn-view-document" @click="viewDocument" title="Open document in new window">
              📄 View Document
            </button>
            <button class="modal-close" @click="closeAnalysisModal">×</button>
          </div>
        </div>
        <div class="modal-body analysis-with-chat">
          <!-- Analysis Section -->
          <div class="analysis-section">
            <div class="analysis-meta">
              <h3>{{ selectedDocument?.fileName }}</h3>
              <p class="analysis-date" v-if="selectedDocument?.analyzedAt">
                Analyzed: {{ formatDate(selectedDocument.analyzedAt) }}
              </p>
            </div>
            <div class="analysis-content">
              {{ selectedDocument?.analysis }}
            </div>
          </div>

          <!-- Chat Section -->
          <div class="chat-section">
            <h4>Ask Questions About This Document</h4>
            
            <!-- Conversation History -->
            <div class="conversation-history">
              <div v-for="(msg, idx) in selectedDocument?.conversationHistory" :key="idx" :class="`message ${msg.role}`">
                <div class="message-label">{{ msg.role === 'user' ? 'You' : 'Assistant' }}</div>
                <div class="message-content">{{ msg.content }}</div>
              </div>
              <div v-if="!selectedDocument?.conversationHistory || selectedDocument.conversationHistory.length === 0" class="no-messages">
                No messages yet. Ask a question to get started.
              </div>
            </div>

            <!-- Chat Input -->
            <div class="chat-input-area">
              <textarea 
                v-model="chatMessage" 
                placeholder="Ask a question about this document..."
                @keyup.enter.ctrl="sendChatMessage"
                :disabled="chatLoading"
                rows="3"
              ></textarea>
              <button 
                @click="sendChatMessage" 
                :disabled="!chatMessage.trim() || chatLoading"
                class="send-btn"
              >
                {{ chatLoading ? 'Sending...' : 'Send' }}
              </button>
            </div>
            <div v-if="chatError" class="chat-error">{{ chatError }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFileNumbers } from '../composables/useFileNumbers'
import { useDocuments } from '../composables/useDocuments'
import { usePackages } from '../composables/usePackages'
import api from '../utils/api'

const route = useRoute()
const { currentFileNumber, loading, error, fetchFileNumberById, updateFileNumber } = useFileNumbers()
const { documents, fetchDocumentsByFileId, analyzeDocument: analyzeDoc, fetchConversationHistory, chatAboutDocument } = useDocuments()
const { packages, fetchPackagesByFileNumber } = usePackages()

const fileNumber = ref(null)
const matterDescription = ref('')
const isSaving = ref(false)
const saveError = ref('')
const PAGE_SIZE = 20
const searchQuery = ref('')
const sortBy = ref('name-asc')
const currentPage = ref(1)
const chatMessage = ref('')
const chatLoading = ref(false)
const chatError = ref('')
const showAnalysisModal = ref(false)
const selectedDocument = ref(null)
const analyzingDocId = ref(null)

const isDescriptionDirty = computed(() => {
  const current = fileNumber.value?.description || ''
  return matterDescription.value.trim() !== current.trim()
})

const existingPackage = computed(() => {
  return packages.value.length > 0 ? packages.value[0] : null
})

const packageButtonText = computed(() => {
  return existingPackage.value ? 'View Demand Package' : 'Create Demand Package'
})

const packageButtonRoute = computed(() => {
  if (existingPackage.value) {
    return { name: 'PackageDetail', params: { id: existingPackage.value.packageId } }
  }
  return { name: 'DemandPackages', params: { clientId: route.params.clientId, fileNumberId: route.params.fileNumberId } }
})

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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredDocuments.value.length / PAGE_SIZE)))

const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredDocuments.value.slice(start, start + PAGE_SIZE)
})

// Reset to page 1 whenever the filtered set changes
watch([searchQuery, sortBy], () => { currentPage.value = 1 })

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const formatSize = (size) => {
  if (!size) return '-'
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/**
 * Check if document type is supported for analysis
 * Supported: PDF, Word (.docx), text files
 * Not supported: Images, scanned PDFs without text, old .doc format
 */
const isAnalysisSupported = (doc) => {
  const fileName = doc.fileName.toLowerCase()
  const contentType = doc.contentType.toLowerCase()
  
  // Supported file extensions
  if (fileName.endsWith('.pdf') || 
      fileName.endsWith('.docx') || 
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.xml')) {
    return true
  }
  
  // Supported content types
  if (contentType.includes('pdf') ||
      contentType.includes('wordprocessingml') ||
      contentType.includes('text') ||
      contentType.includes('json') ||
      contentType.includes('xml')) {
    return true
  }
  
  return false
}

/**
 * INTENT: Persist file number description for AI context
 * Input: free-form description text and file number ID
 * Output: saved description on the file number record and updated local state
 * Constraints: allow empty description, skip save when unchanged
 */
const saveDescription = async () => {
  if (!fileNumber.value || !isDescriptionDirty.value) return
  isSaving.value = true
  saveError.value = ''
  try {
    const updated = await updateFileNumber(fileNumber.value.fileId, {
      description: matterDescription.value.trim()
    })
    fileNumber.value = updated
    matterDescription.value = updated.description || ''
  } catch (err) {
    saveError.value = err.message || 'Failed to save description'
  } finally {
    isSaving.value = false
  }
}

/**
 * INTENT: Invoke Bedrock agent to analyze document
 * Input: document object with fileId and documentId
 * Output: analysis stored in document, modal opened to display result
 */
const analyzeDocument = async (doc) => {
  analyzingDocId.value = doc.documentId
  try {
    const result = await analyzeDoc({
      fileId: route.params.fileNumberId,
      documentId: doc.documentId,
    })
    selectedDocument.value = documents.value.find(d => d.documentId === doc.documentId)
    showAnalysisModal.value = true
    try {
      const history = await fetchConversationHistory({
        fileId: route.params.fileNumberId,
        documentId: doc.documentId,
      })
      selectedDocument.value = { ...selectedDocument.value, conversationHistory: history }
    } catch (err) {
      console.error('Failed to load conversation history:', err)
    }
  } catch (err) {
    console.error('Failed to analyze document:', err)
    alert(`Failed to analyze document: ${err.message}`)
  } finally {
    analyzingDocId.value = null
  }
}

/**
 * INTENT: Display existing analysis for a document
 * Input: document object with analysis
 * Output: modal opened with analysis content
 */
const viewAnalysis = async (doc) => {
  selectedDocument.value = doc
  showAnalysisModal.value = true
  try {
    const history = await fetchConversationHistory({
      fileId: route.params.fileNumberId,
      documentId: doc.documentId,
    })
    selectedDocument.value = { ...selectedDocument.value, conversationHistory: history }
  } catch (err) {
    console.error('Failed to load conversation history:', err)
  }
}

/**
 * INTENT: Close analysis modal
 */
const closeAnalysisModal = () => {
  showAnalysisModal.value = false
  selectedDocument.value = null
  chatMessage.value = ''
  chatError.value = ''
}

/**
 * INTENT: Open document in new window via presigned URL
 */
const viewDocument = async () => {
  if (!selectedDocument.value?.s3Key) return
  
  try {
    // Request presigned URL from backend using the shared API client.
    // This ensures Cognito session tokens (Amplify) are included correctly.
    const data = await api.post(
      `/file-numbers/${route.params.fileNumberId}/documents/${selectedDocument.value.documentId}/presigned-url`,
      {}
    )
    
    // Open presigned URL in new window
    window.open(data.url, '_blank')
  } catch (error) {
    console.error('Error viewing document:', error)
    alert('Failed to open document: ' + error.message)
  }
}

/**
 * INTENT: Send chat message about document
 */
const sendChatMessage = async () => {
  if (!chatMessage.value.trim()) return
  
  chatLoading.value = true
  chatError.value = ''
  
  try {
    const response = await chatAboutDocument({
      fileId: route.params.fileNumberId,
      documentId: selectedDocument.value.documentId,
      message: chatMessage.value
    })
    
    // Update selected document with new conversation
    selectedDocument.value = {
      ...selectedDocument.value,
      conversationHistory: response.conversationHistory
    }
    
    chatMessage.value = ''
  } catch (err) {
    chatError.value = err.message || 'Failed to send message'
    console.error('Chat error:', err)
  } finally {
    chatLoading.value = false
  }
}

onMounted(async () => {
  try {
    const data = await fetchFileNumberById(route.params.fileNumberId)
    fileNumber.value = data
    matterDescription.value = data?.description || ''
    await Promise.all([
      fetchDocumentsByFileId(route.params.fileNumberId),
      fetchPackagesByFileNumber(route.params.fileNumberId)
    ])
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

.page-title {
  margin: 0;
  color: #333;
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-pill {
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  background: #e5e7eb;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
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


.matter-description {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.description-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.description-header h3 {
  margin: 0;
  color: #333;
}

.description-hint {
  margin: 0 0 0.75rem 0;
  color: #6b7280;
  font-size: 13px;
}

.description-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  min-height: 120px;
}

.description-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.functions-section h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.functions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.functions-header h3 {
  margin: 0;
}

.functions-hint {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  font-size: 13px;
}

.btn-compact {
  padding: 0.4rem 0.8rem;
  font-size: 13px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}

.btn-compact:hover {
  background: #e0e7ff;
}


.documents-section {
  margin-top: 2.5rem;
}

.documents-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.documents-header h3 {
  margin: 0;
  color: #333;
}

.documents-count {
  color: #667eea;
  font-weight: 600;
  font-size: 13px;
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
  grid-template-columns: 2fr 0.8fr 1fr 0.8fr;
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

.col-action {
  text-align: right;
}

.btn-analyze,
.btn-view {
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-analyze {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-analyze:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #654090 100%);
  transform: translateY(-1px);
}

.btn-analyze:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-view {
  background: #6b7280;
  color: white;
}

.btn-view:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

.unsupported-hint {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #111827;
  font-size: 1.5rem;
  flex: 1;
}

.modal-header-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-view-document {
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-view-document:hover {
  background: #059669;
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
}

.analysis-meta {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.analysis-meta h3 {
  margin: 0 0 0.5rem 0;
  color: #111827;
  font-size: 1.125rem;
}

.analysis-date {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.analysis-content {
  line-height: 1.7;
  color: #374151;
  white-space: pre-wrap;
  font-size: 0.95rem;
}

.analysis-with-chat {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-height: 600px;
}

.analysis-section {
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
  padding-right: 15px;
}

.chat-section {
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
}

.chat-section h4 {
  margin: 0 0 15px 0;
  font-size: 1rem;
  color: #1f2937;
}

.conversation-history {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #f9fafb;
  margin-bottom: 12px;
}

.no-messages {
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
  padding: 20px 0;
}

.message {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message-content {
  padding: 8px 12px;
  border-radius: 6px;
  max-width: 90%;
  word-break: break-word;
  line-height: 1.5;
  font-size: 0.875rem;
}

.message.user .message-content {
  background: #3b82f6;
  color: white;
}

.message.assistant .message-content {
  background: #e5e7eb;
  color: #1f2937;
}

.chat-input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-input-area textarea {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

.chat-input-area textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.chat-input-area textarea:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.send-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #2563eb;
}

.send-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.chat-error {
  color: #dc2626;
  font-size: 0.875rem;
  padding: 8px;
  background: #fee2e2;
  border-radius: 6px;
  margin-top: 8px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.page-btn {
  padding: 0.4rem 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.page-info {
  font-size: 13px;
  color: #6b7280;
  min-width: 6rem;
  text-align: center;
}
</style>
