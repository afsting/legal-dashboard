<template>
  <div class="client-detail">
    <header class="navbar">
      <h1>Client Detail</h1>
      <router-link :to="{ name: 'Clients' }" class="btn-secondary">Back to Clients</router-link>
    </header>

    <main class="content">
      <div v-if="loading" class="loading-message">
        Loading client details...
      </div>

      <div v-else-if="error || !client" class="error-message">
        Client not found
      </div>

      <div v-else class="client-info">
        <div class="client-header">
          <div>
            <h2>{{ client.name }}</h2>
            <span class="client-type-badge" :class="client.clientType || 'individual'">
              {{ client.clientType === 'business' ? 'Business' : 'Individual' }}
            </span>
          </div>
          <div class="header-actions">
            <button v-if="!isEditing" @click="startEdit" class="btn-edit">Edit Client</button>
            <button @click="showAddFileNumber = true" class="btn-primary">+ New File Number</button>
          </div>
        </div>

        <!-- Read-only view -->
        <div v-if="!isEditing" class="client-details">
          <div class="details-card">
            <h3>Client Details</h3>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">{{ client.phone || 'Not provided' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ client.email || 'Not provided' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Address</span>
                <span class="detail-value">{{ client.address || 'No address on file' }}</span>
              </div>
            </div>
            <div class="detail-notes">
              <span class="detail-label">Notes</span>
              <p class="detail-notes-body">{{ client.notes || 'No notes yet.' }}</p>
            </div>
          </div>
        </div>

        <!-- Edit form -->
        <div v-else class="client-details">
          <div class="details-card">
            <h3>Edit Client</h3>
            <form @submit.prevent="handleSave">
              <div class="edit-grid">
                <div class="form-group">
                  <label for="edit-type">Client Type</label>
                  <select v-model="editForm.clientType" id="edit-type">
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="edit-name">Name *</label>
                  <input
                    v-model="editForm.name"
                    id="edit-name"
                    type="text"
                    placeholder="Client name"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="edit-email">Email *</label>
                  <input
                    v-model="editForm.email"
                    id="edit-email"
                    type="email"
                    placeholder="Email address"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="edit-phone">Phone</label>
                  <input
                    v-model="editForm.phone"
                    id="edit-phone"
                    type="tel"
                    placeholder="Phone number"
                  />
                </div>

                <div class="form-group full-width">
                  <label for="edit-address">Address</label>
                  <input
                    v-model="editForm.address"
                    id="edit-address"
                    type="text"
                    placeholder="Street address"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="edit-notes">Notes</label>
                <textarea
                  v-model="editForm.notes"
                  id="edit-notes"
                  placeholder="Internal notes about this client..."
                  rows="4"
                ></textarea>
              </div>

              <p v-if="saveError" class="save-error">{{ saveError }}</p>

              <div class="edit-actions">
                <button type="submit" class="btn-primary" :disabled="isSaving">
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
                <button type="button" @click="cancelEdit" class="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <div class="file-numbers-section">
          <h3>File Numbers</h3>

          <div v-if="!fileNumbers || fileNumbers.length === 0" class="empty-state">
            <p>No file numbers yet. Add a file number to get started.</p>
          </div>

          <div v-else class="file-numbers-list">
            <div class="list-header">
              <div class="col-number">File Number</div>
              <div class="col-type">File Type</div>
              <div class="col-description">Description</div>
              <div class="col-status">Status</div>
              <div class="col-created">Created Date</div>
            </div>

            <div
              v-for="fileNumber in fileNumbers"
              :key="fileNumber.fileId"
              class="list-row"
              role="button"
              tabindex="0"
              @click="goToFileNumber(fileNumber.fileId)"
              @keydown.enter="goToFileNumber(fileNumber.fileId)"
              @keydown.space.prevent="goToFileNumber(fileNumber.fileId)"
            >
              <div class="col-number">
                <strong>{{ fileNumber.fileNumber }}</strong>
              </div>
              <div class="col-type">
                {{ formatFileType(fileNumber.fileType) }}
              </div>
              <div class="col-description">
                {{ fileNumber.description || 'No description' }}
              </div>
              <div class="col-status">
                <span class="status-badge" :class="fileNumber.status || 'active'">
                  {{ fileNumber.status || 'Active' }}
                </span>
              </div>
              <div class="col-created">
                {{ formatDate(fileNumber.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Add File Number Modal -->
    <div v-if="showAddFileNumber" class="modal-overlay" @click="showAddFileNumber = false">
      <div class="modal-content" @click.stop>
        <h2>Add New File Number</h2>
        <form @submit.prevent="handleAddFileNumber">
          <div class="form-group">
            <label for="number">File Number *</label>
            <input
              v-model="newFileNumber.number"
              id="number"
              type="text"
              placeholder="Enter file number (e.g., 2024-001)"
              required
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              v-model="newFileNumber.description"
              id="description"
              placeholder="Enter case description"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="type">File Type</label>
            <select v-model="newFileNumber.fileType" id="type">
              <option value="">Select a file type</option>
              <option value="accident-injury">Accident/Injury</option>
              <option value="work-comp">Work Comp</option>
              <option value="landlord-tenant">Landlord-Tenant</option>
            </select>
          </div>

          <div class="form-group">
            <label for="court">Court</label>
            <input
              v-model="newFileNumber.court"
              id="court"
              type="text"
              placeholder="Enter court name"
            />
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-primary">Add File Number</button>
            <button type="button" @click="showAddFileNumber = false" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClients } from '../composables/useClients'
import { useFileNumbers } from '../composables/useFileNumbers'

const router = useRouter()
const route = useRoute()
const { currentClient, loading, error, fetchClientById, updateClient } = useClients()
const { fileNumbers, createFileNumber, fetchFileNumbersByClient } = useFileNumbers()

const client = ref(null)
const isEditing = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const editForm = ref({})
const showAddFileNumber = ref(false)
const newFileNumber = ref({
  number: '',
  description: '',
  fileType: '',
  court: '',
  status: 'active'
})

const startEdit = () => {
  editForm.value = {
    clientType: client.value.clientType || 'individual',
    name: client.value.name || '',
    email: client.value.email || '',
    phone: client.value.phone || '',
    address: client.value.address || '',
    notes: client.value.notes || '',
  }
  saveError.value = ''
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  saveError.value = ''
}

const handleSave = async () => {
  isSaving.value = true
  saveError.value = ''
  try {
    const updated = await updateClient(route.params.clientId, editForm.value)
    client.value = updated
    isEditing.value = false
  } catch (err) {
    saveError.value = err.message || 'Failed to save changes'
  } finally {
    isSaving.value = false
  }
}

const formatFileType = (fileType) => {
  if (!fileType) return 'Not set'
  switch (fileType) {
    case 'accident-injury': return 'Accident/Injury'
    case 'work-comp': return 'Work Comp'
    case 'landlord-tenant': return 'Landlord-Tenant'
    default: return fileType
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const goToFileNumber = (fileNumberId) => {
  router.push({
    name: 'FileNumberDetail',
    params: {
      clientId: route.params.clientId,
      fileNumberId
    }
  })
}

const handleAddFileNumber = async () => {
  if (newFileNumber.value.number.trim()) {
    try {
      await createFileNumber({
        clientId: route.params.clientId,
        fileNumber: newFileNumber.value.number,
        description: newFileNumber.value.description,
        fileType: newFileNumber.value.fileType,
        status: newFileNumber.value.status
      })
      await fetchFileNumbersByClient(route.params.clientId)
      newFileNumber.value = { number: '', description: '', fileType: '', court: '', status: 'active' }
      showAddFileNumber.value = false
    } catch (err) {
      console.error('Error adding file number:', err)
    }
  }
}

onMounted(async () => {
  try {
    const data = await fetchClientById(route.params.clientId)
    client.value = data
    await fetchFileNumbersByClient(route.params.clientId)
  } catch (err) {
    console.error('Error fetching client:', err)
  }
})
</script>

<style scoped>
.client-detail {
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

.client-info {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.client-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #667eea;
}

.client-header h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.client-type-badge {
  display: inline-block;
  padding: 0.2rem 0.7rem;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.client-type-badge.individual {
  background: #dbeafe;
  color: #1d4ed8;
}

.client-type-badge.business {
  background: #d1fae5;
  color: #065f46;
}

.client-details {
  margin-bottom: 2rem;
}

.details-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
}

.details-card h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 18px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 2rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  font-weight: 600;
}

.detail-value {
  font-size: 14px;
  color: #1f2937;
}

.detail-notes {
  margin-top: 1.5rem;
}

.detail-notes-body {
  margin: 0.5rem 0 0 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #374151;
  font-size: 14px;
  min-height: 72px;
  white-space: pre-wrap;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 1.5rem;
}

.edit-grid .full-width {
  grid-column: 1 / -1;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.save-error {
  color: #dc2626;
  font-size: 13px;
  margin: 0 0 1rem 0;
}

.edit-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.btn-edit {
  padding: 0.5rem 1rem;
  background: white;
  color: #667eea;
  border: 1.5px solid #667eea;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #667eea;
  color: white;
}

.btn-primary {
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):hover {
  opacity: 0.9;
}

.file-numbers-section h3 {
  color: #333;
  margin-top: 0;
}

.empty-state {
  padding: 2rem;
  background: #f9f9f9;
  border-radius: 4px;
  color: #666;
  text-align: center;
}

.file-numbers-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 1rem;
}

.file-numbers-list .list-header {
  display: grid;
  grid-template-columns: 1.5fr 1.4fr 2.1fr 1fr 1.5fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.file-numbers-list .list-row {
  display: grid;
  grid-template-columns: 1.5fr 1.4fr 2.1fr 1fr 1.5fr;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  transition: background 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.file-numbers-list .list-row:hover {
  background: #f8f9ff;
  box-shadow: inset 4px 0 0 #667eea;
}

.file-numbers-list .list-row:last-child {
  border-bottom: none;
}

.col-number { font-size: 15px; }
.col-number strong { color: #333; }
.col-description { font-size: 13px; color: #666; }
.col-type { font-size: 13px; color: #4b5563; font-weight: 600; }
.col-status { font-size: 13px; }

.status-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active { background: #28a745; color: white; }
.status-badge.closed { background: #6c757d; color: white; }

.col-created { color: #666; font-size: 13px; }

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.modal-content h2 {
  margin-top: 0;
  color: #333;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}
</style>
