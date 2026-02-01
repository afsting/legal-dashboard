<template>
  <div class="clients-page">
    <div class="navbar">
      <h1>Legal Dashboard</h1>
      <div class="user-menu">
        <router-link to="/dashboard" class="btn-back">← Dashboard</router-link>
        <router-link to="/settings" class="btn-settings">Settings</router-link>
        <button @click="handleLogout" class="btn-logout">Logout</button>
      </div>
    </div>

    <main class="content">
      <div class="page-header">
        <h2>Clients</h2>
        <button class="btn-primary" @click="showAddClient = true">+ Add Client</button>
      </div>

      <div v-if="clients.length === 0 && !loading" class="empty-state">
        <p>No clients yet. Add one to get started!</p>
      </div>

      <div v-if="clients.length > 0">
        <div class="search-filter-bar">
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search clients by name, email, or phone..."
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
            </select>
          </div>
        </div>

        <div class="clients-list">
          <div class="list-header">
            <div class="col-name">Client Name</div>
            <div class="col-contact">Contact Information</div>
            <div class="col-created">Created Date</div>
            <div class="col-actions">Actions</div>
          </div>

          <div v-for="client in filteredClients" :key="client.clientId" class="list-row">
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
            <div class="col-created">
              {{ formatDate(client.createdAt) }}
            </div>
            <div class="col-actions">
              <button @click="goToClient(client.clientId)" class="btn-view">View Details</button>
              <button @click="handleDelete(client.clientId)" class="btn-delete">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showAddClient" class="modal-overlay" @click="showAddClient = false">
      <div class="modal-content" @click.stop>
        <h2>Add New Client</h2>
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label for="name">Client Name *</label>
            <input
              v-model="form.name"
              id="name"
              type="text"
              placeholder="Enter client name"
              required
            />
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input
              v-model="form.email"
              id="email"
              type="email"
              placeholder="Enter email address"
              required
            />
          </div>

          <div class="form-group">
            <label for="phone">Phone</label>
            <input
              v-model="form.phone"
              id="phone"
              type="tel"
              placeholder="Enter phone number"
            />
          </div>

          <div class="form-group">
            <label for="address">Address</label>
            <input
              v-model="form.address"
              id="address"
              type="text"
              placeholder="Enter address"
            />
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-primary">Add Client</button>
            <button type="button" @click="showAddClient = false" class="btn-secondary">Cancel</button>
          </div>
          <p v-if="error" class="error">{{ error }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/authStore'
import { useClients } from '../composables/useClients'

const router = useRouter()
const { logout } = useAuth()
const { clients, loading, error, fetchClients, createClient, deleteClient } = useClients()

const showAddClient = ref(false)
const searchQuery = ref('')
const sortBy = ref('name')
const form = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  status: 'active'
})

const filteredClients = computed(() => {
  let filtered = clients.value

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(client =>
      client.name.toLowerCase().includes(query) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.phone && client.phone.includes(query))
    )
  }

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

const handleCreate = async () => {
  try {
    await createClient(form.value)
    form.value = { name: '', email: '', phone: '', address: '', status: 'active' }
    showAddClient.value = false
  } catch (err) {
    console.error('Create error:', err)
  }
}

const handleDelete = async (clientId) => {
  if (confirm('Are you sure you want to delete this client?')) {
    try {
      await deleteClient(clientId)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }
}

onMounted(() => {
  fetchClients()
})
</script>

<style scoped>
.clients-page {
  min-height: 100vh;
  background: #f5f5f5;
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
}

.btn-back {
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

.btn-back:hover {
  background: #5a6268;
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
  max-width: 1400px;
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
  grid-template-columns: 2fr 2.5fr 1.5fr 1.5fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.list-row {
  display: grid;
  grid-template-columns: 2fr 2.5fr 1.5fr 1.5fr;
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

.btn-delete {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-delete:hover {
  background: #c82333;
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

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.form-group input:focus {
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

.error {
  color: #dc3545;
  font-size: 14px;
  margin-top: 1rem;
}
</style>
