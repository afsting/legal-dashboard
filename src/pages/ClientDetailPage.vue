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
            <p class="client-subtitle">{{ client.email }}</p>
            <p class="client-subtitle">{{ client.phone }}</p>
          </div>
          <button @click="showAddFileNumber = true" class="btn-primary">+ New File Number</button>
        </div>

        <div class="file-numbers-section">
          <h3>File Numbers (Court Cases)</h3>
          
          <div v-if="!fileNumbers || fileNumbers.length === 0" class="empty-state">
            <p>No file numbers yet. Add a file number to get started.</p>
          </div>

          <div v-else class="file-numbers-list">
            <div class="list-header">
              <div class="col-number">File Number</div>
              <div class="col-description">Description</div>
              <div class="col-status">Status</div>
              <div class="col-created">Created Date</div>
              <div class="col-actions">Actions</div>
            </div>

            <div v-for="fileNumber in fileNumbers" :key="fileNumber.fileId" class="list-row">
              <div class="col-number">
                <strong>{{ fileNumber.fileNumber }}</strong>
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
              <div class="col-actions">
                <button @click="goToFileNumber(fileNumber.fileId)" class="btn-view">View Details</button>
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
const { currentClient, loading, error, fetchClientById } = useClients()
const { fileNumbers, createFileNumber, fetchFileNumbersByClient } = useFileNumbers()

const client = ref(null)
const showAddFileNumber = ref(false)
const newFileNumber = ref({
  number: '',
  description: '',
  court: '',
  status: 'active'
})

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
        status: newFileNumber.value.status
      })
      
      // Refresh file numbers list
      await fetchFileNumbersByClient(route.params.clientId)
      
      newFileNumber.value = { number: '', description: '', court: '', status: 'active' }
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
    
    // Fetch file numbers for this client
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

.client-subtitle {
  margin: 0.25rem 0;
  color: #666;
  font-size: 14px;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  transform: translateY(-2px);
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
  grid-template-columns: 1.5fr 2.5fr 1fr 1.5fr 1.2fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.file-numbers-list .list-row {
  display: grid;
  grid-template-columns: 1.5fr 2.5fr 1fr 1.5fr 1.2fr;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  transition: background 0.2s;
}

.file-numbers-list .list-row:hover {
  background: #f8f9ff;
}

.file-numbers-list .list-row:last-child {
  border-bottom: none;
}

.col-number {
  font-size: 15px;
}

.col-number strong {
  color: #333;
}

.col-description {
  font-size: 13px;
  color: #666;
}

.col-status {
  font-size: 13px;
}

.status-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #28a745;
  color: white;
}

.status-badge.closed {
  background: #6c757d;
  color: white;
}

.col-created {
  color: #666;
  font-size: 13px;
}

.col-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-view {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-view:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

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

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

input,
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.3s;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}
</style>
