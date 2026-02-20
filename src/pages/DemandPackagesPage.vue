<template>
  <div class="demand-packages">
    <header class="navbar">
      <h1>Demand Packages</h1>
      <router-link :to="{ name: 'FileNumberDetail', params: { clientId: $route.params.clientId, fileNumberId: $route.params.fileNumberId } }" class="btn-secondary">Back to File Number</router-link>
    </header>

    <main class="content">
      <div class="packages-header">
        <h2>Demand Packages for {{ fileNumber?.number }}</h2>
        <button @click="showCreatePackage = true" class="btn-primary">+ New Demand Package</button>
      </div>

      <div v-if="packages.length === 0" class="empty-state">
        <p>No demand packages yet. Create your first demand package to get started.</p>
      </div>

      <div v-else class="packages-grid">
        <div v-for="pkg in packages" :key="pkg.packageId" class="package-card">
          <div class="card-header">
            <h3>{{ pkg.name }}</h3>
            <span class="status-badge" :class="pkg.status">{{ pkg.status }}</span>
          </div>
          <p class="card-description">{{ pkg.description }}</p>
          <div class="card-meta">
            <small>Created: {{ formatDate(pkg.createdAt) }}</small>
          </div>
          <div class="card-actions">
            <router-link :to="{ name: 'PackageDetail', params: { packageId: pkg.packageId } }" class="btn-link">View Details</router-link>
            <router-link :to="{ name: 'Checklist', params: { packageId: pkg.packageId } }" class="btn-link">Document Checklist</router-link>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Package Modal -->
    <div v-if="showCreatePackage" class="modal-overlay" @click="showCreatePackage = false">
      <div class="modal-content" @click.stop>
        <h2>Create Demand Package</h2>
        <form @submit.prevent="handleCreatePackage">
          <div class="form-group">
            <label for="name">Package Name *</label>
            <input 
              v-model="newPackage.name" 
              id="name"
              type="text" 
              placeholder="Enter package name"
              required
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              v-model="newPackage.description" 
              id="description"
              placeholder="Enter package description"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="recipient">Recipient *</label>
            <input 
              v-model="newPackage.recipient" 
              id="recipient"
              type="text" 
              placeholder="Enter recipient name/firm"
              required
            />
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-primary">Create Package</button>
            <button type="button" @click="showCreatePackage = false" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFileNumbers } from '../composables/useFileNumbers'
import { usePackages } from '../composables/usePackages'

const router = useRouter()
const route = useRoute()
const { currentFileNumber, fetchFileNumberById } = useFileNumbers()
const { packages, loading, error, fetchPackagesByFileNumber, createPackage } = usePackages()

const fileNumber = ref(null)
const showCreatePackage = ref(false)
const newPackage = ref({
  name: '',
  description: '',
  recipient: ''
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const handleCreatePackage = async () => {
  if (newPackage.value.name.trim()) {
    try {
      await createPackage({
        clientId: route.params.clientId,
        fileNumberId: route.params.fileNumberId,
        name: newPackage.value.name,
        description: newPackage.value.description,
        recipient: newPackage.value.recipient,
        status: 'draft'
      })
      newPackage.value = { name: '', description: '', recipient: '' }
      showCreatePackage.value = false
      await fetchPackagesByFileNumber(route.params.fileNumberId)
    } catch (err) {
      console.error('Error creating package:', err)
    }
  }
}

onMounted(async () => {
  try {
    const data = await fetchFileNumberById(route.params.fileNumberId)
    fileNumber.value = data
    await fetchPackagesByFileNumber(route.params.fileNumberId)
  } catch (err) {
    console.error('Error loading data:', err)
  }
})
</script>

<style scoped>
.demand-packages {
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

.packages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.packages-header h2 {
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
  white-space: nowrap;
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

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.package-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.package-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  color: #333;
  flex: 1;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  margin-left: 1rem;
}

.status-badge.draft {
  background: #ffeaa7;
  color: #d63031;
}

.status-badge.in-progress {
  background: #a29bfe;
  color: #2d3436;
}

.status-badge.completed {
  background: #55efc4;
  color: #00b894;
}

.card-description {
  color: #666;
  margin: 0.5rem 0;
  font-size: 14px;
}

.card-meta {
  color: #999;
  font-size: 12px;
  margin: 1rem 0;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-link {
  flex: 1;
  padding: 0.5rem;
  text-align: center;
  text-decoration: none;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-link:hover {
  background: #f0f2ff;
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
