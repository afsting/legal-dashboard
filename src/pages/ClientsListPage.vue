<template>
  <div class="clients-page">
    <header class="navbar">
      <h1>Penny Page - Clients</h1>
      <div class="user-menu">
        <span>{{ currentUser.email }}</span>
        <router-link to="/settings" class="btn-settings">Settings</router-link>
        <button @click="handleLogout" class="btn-logout">Logout</button>
      </div>
    </header>

    <main class="content">
      <div class="page-header">
        <h2>Client Management</h2>
        <button @click="showAddClient = true" class="btn-primary">+ New Client</button>
      </div>

      <!-- Search and Filter Bar -->
      <div class="search-filter-bar">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="🔍 Search by name, email, or phone..."
            class="search-input"
          />
        </div>
        <div class="filter-group">
          <label>Sort by:</label>
          <select v-model="sortBy" class="filter-select">
            <option value="name">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="date-newest">Newest First</option>
            <option value="date-oldest">Oldest First</option>
            <option value="files-most">Most File Numbers</option>
            <option value="files-least">Least File Numbers</option>
          </select>
        </div>
      </div>

      <div v-if="filteredClients.length === 0 && clients.length === 0" class="empty-state">
        <p>No clients yet. Add your first client to get started.</p>
      </div>

      <div v-else-if="filteredClients.length === 0" class="empty-state">
        <p>No clients match your search criteria.</p>
      </div>

      <div v-else class="clients-list">
        <div class="list-header">
          <div class="col-name">Client Name</div>
          <div class="col-contact">Contact Information</div>
          <div class="col-files">File Numbers</div>
          <div class="col-created">Created Date</div>
          <div class="col-actions">Actions</div>
        </div>
        
        <div v-for="client in filteredClients" :key="client.id" class="list-row">
          <div class="col-name">
            <strong>{{ client.name }}</strong>
          </div>
          <div class="col-contact">
            <div v-if="client.email" class="contact-item">
              <span class="contact-label">📧</span>
              <span>{{ client.email }}</span>
            </div>
            <div v-if="client.phone" class="contact-item">
              <span class="contact-label">📞</span>
              <span>{{ client.phone }}</span>
            </div>
            <div v-if="!client.email && !client.phone" class="contact-empty">
              No contact info
            </div>
          </div>
          <div class="col-files">
            <span class="badge-files">{{ client.fileNumbers.length }}</span>
          </div>
          <div class="col-created">
            {{ formatDate(client.createdAt) }}
          </div>
          <div class="col-actions">
            <button @click="goToClient(client.id)" class="btn-view">View Details</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Client Modal -->
    <div v-if="showAddClient" class="modal-overlay" @click="showAddClient = false">
      <div class="modal-content" @click.stop>
        <h2>Add New Client</h2>
        <form @submit.prevent="handleAddClient">
          <div class="form-group">
            <label for="name">Client Name *</label>
            <input 
              v-model="newClient.name" 
              id="name"
              type="text" 
              placeholder="Enter client name"
              required
            />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input 
              v-model="newClient.email" 
              id="email"
              type="email" 
              placeholder="Enter email address"
            />
          </div>

          <div class="form-group">
            <label for="phone">Phone</label>
            <input 
              v-model="newClient.phone" 
              id="phone"
              type="tel" 
              placeholder="Enter phone number"
            />
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-primary">Add Client</button>
            <button type="button" @click="showAddClient = false" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/authStore'
import { useClientStore } from '../stores/clientStore'

const router = useRouter()
const { currentUser, logout } = useAuth()
const { clients, addClient } = useClientStore()

const showAddClient = ref(false)
const searchQuery = ref('')
const sortBy = ref('name')
const newClient = ref({
  name: '',
  email: '',
  phone: ''
})

const filteredClients = computed(() => {
  let filtered = clients.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(client => 
      client.name.toLowerCase().includes(query) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.phone && client.phone.includes(query))
    )
  }

  // Apply sorting
  const sorted = [...filtered]
  switch (sortBy.value) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'date-newest':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      break
    case 'date-oldest':
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      break
    case 'files-most':
      sorted.sort((a, b) => b.fileNumbers.length - a.fileNumbers.length)
      break
    case 'files-least':
      sorted.sort((a, b) => a.fileNumbers.length - b.fileNumbers.length)
      break
  }

  return sorted
})

const handleLogout = () => {
  logout()
  router.push({ name: 'Login' })
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const goToClient = (clientId) => {
  router.push({ name: 'ClientDetail', params: { clientId } })
}

const handleAddClient = () => {
  if (newClient.value.name.trim()) {
    addClient(newClient.value)
    newClient.value = { name: '', email: '', phone: '' }
    showAddClient.value = false
  }
}

onMounted(() => {
  const { initializeAuth } = useAuth()
  initializeAuth()
})
</script>

<style scoped>
.clients-page {
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

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #666;
}

.btn-settings {
  padding: 0.5rem 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  display: inline-block;
}

.btn-settings:hover {
  background: #218838;
}

.btn-logout {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-logout:hover {
  background: #c82333;
}

.content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h2 {
  margin: 0;
  color: #333;
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
}

.btn-primary:hover {
  transform: translateY(-2px);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  color: #666;
}

.search-filter-bar {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.clients-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.list-header {
  display: grid;
  grid-template-columns: 2fr 2.5fr 1fr 1.5fr 1.5fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.list-row {
  display: grid;
  grid-template-columns: 2fr 2.5fr 1fr 1.5fr 1.5fr;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  transition: background 0.2s;
}

.list-row:hover {
  background: #f8f9ff;
}

.list-row:last-child {
  border-bottom: none;
}

.col-name {
  font-size: 15px;
}

.col-name strong {
  color: #333;
}

.col-contact {
  font-size: 13px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
  color: #666;
}

.contact-label {
  font-size: 12px;
}

.contact-empty {
  color: #999;
  font-style: italic;
}

.col-files {
  text-align: center;
}

.badge-files {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-weight: 600;
  font-size: 13px;
  min-width: 30px;
}

.col-created {
  color: #666;
  font-size: 13px;
}

.col-actions {
  text-align: right;
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

.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
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

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-secondary {
  flex: 1;
  padding: 0.75rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #5a6268;
}
</style>
