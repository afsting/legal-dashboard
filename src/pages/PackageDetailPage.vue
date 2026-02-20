<template>
  <div class="package-detail">
    <header class="navbar">
      <h1>Package Details</h1>
      <router-link
        v-if="currentPackage"
        :to="{ name: 'DemandPackages', params: { clientId: currentPackage.clientId, fileNumberId: currentPackage.fileNumberId } }"
        class="btn-secondary"
      >
        Back to Packages
      </router-link>
    </header>

    <main class="content">
      <div v-if="!currentPackage" class="error-message">
        Package not found
      </div>

      <div v-else class="package-info">
        <div class="package-header">
          <div>
            <h2>{{ currentPackage.name }}</h2>
            <span class="status-badge" :class="currentPackage.status">{{ currentPackage.status }}</span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <h3>Client Information</h3>
            <p><strong>Client:</strong> {{ clientName }}</p>
            <p><strong>File Number:</strong> {{ currentPackage.fileNumberId || 'N/A' }}</p>
            <p><strong>Recipient:</strong> {{ currentPackage.recipient || 'N/A' }}</p>
          </div>

          <div class="info-block">
            <h3>Package Details</h3>
            <p><strong>Description:</strong> {{ currentPackage.description || 'No description' }}</p>
            <p><strong>Created:</strong> {{ formatDate(currentPackage.createdAt) }}</p>
            <p><strong>Medical Records:</strong> {{ packageDocuments.medicalRecords.length }}</p>
            <p><strong>Accident Reports:</strong> {{ packageDocuments.accidentReports.length }}</p>
            <p><strong>Photographs:</strong> {{ packageDocuments.photographs.length }}</p>
          </div>
        </div>

        <div class="actions">
          <router-link
            :to="{ name: 'Checklist', params: { packageId: currentPackage.packageId } }"
            class="btn-primary"
          >
            Manage Checklist
          </router-link>
          <button @click="handleDelete" class="btn-danger">Delete Package</button>
        </div>

        <div class="items-section">
          <h3>Required Documents</h3>
          
          <div class="document-category">
            <h4>Medical Records (Required)</h4>
            <div v-if="packageDocuments.medicalRecords.length === 0" class="empty-items">
              <p>No medical records added yet</p>
            </div>
            <div v-else class="items-list">
              <div v-for="(item, index) in packageDocuments.medicalRecords" :key="index" class="item-card">
                {{ item }}
              </div>
            </div>
          </div>

          <div class="document-category">
            <h4>Accident Reports (Optional)</h4>
            <div v-if="packageDocuments.accidentReports.length === 0" class="empty-items">
              <p>No accident reports added</p>
            </div>
            <div v-else class="items-list">
              <div v-for="(item, index) in packageDocuments.accidentReports" :key="index" class="item-card">
                {{ item }}
              </div>
            </div>
          </div>

          <div class="document-category">
            <h4>Photographs (Optional)</h4>
            <div v-if="packageDocuments.photographs.length === 0" class="empty-items">
              <p>No photographs added</p>
            </div>
            <div v-else class="items-list">
              <div v-for="(item, index) in packageDocuments.photographs" :key="index" class="item-card">
                {{ item }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePackages } from '../composables/usePackages'
import { useClients } from '../composables/useClients'
import { useFileNumbers } from '../composables/useFileNumbers'

const router = useRouter()
const route = useRoute()
const { currentPackage, loading, error, fetchPackageById, deletePackage } = usePackages()
const { currentClient, fetchClientById } = useClients()

const clientName = ref('Loading...')
const fileNumberName = ref('')

const packageDocuments = computed(() => {
  if (!currentPackage.value?.documents) {
    return {
      medicalRecords: [],
      accidentReports: [],
      photographs: []
    }
  }
  return currentPackage.value.documents
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const handleDelete = async () => {
  if (confirm('Are you sure you want to delete this package?')) {
    try {
      const pkg = currentPackage.value
      await deletePackage(route.params.packageId)
      router.push({ name: 'DemandPackages', params: { clientId: pkg.clientId, fileNumberId: pkg.fileNumberId } })
    } catch (err) {
      console.error('Error deleting package:', err)
    }
  }
}

onMounted(async () => {
  try {
    await fetchPackageById(route.params.packageId)
    if (currentPackage.value?.clientId) {
      const client = await fetchClientById(currentPackage.value.clientId)
      clientName.value = client?.name || 'Unknown'
    }
  } catch (err) {
    console.error('Error loading package:', err)
  }
})
</script>

<style scoped>
.package-detail {
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
  max-width: 900px;
  margin: 0 auto;
}

.error-message {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  color: #dc3545;
  text-align: center;
}

.package-info {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.package-header {
  border-bottom: 2px solid #667eea;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: start;
}

.package-header h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.info-block h3 {
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
  margin-top: 0;
}

.info-block p {
  margin: 0.5rem 0;
  color: #666;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s;
  display: inline-block;
}

.btn-primary:hover {
  transform: translateY(-2px);
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-danger:hover {
  background: #c82333;
}

.items-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.items-section h3 {
  color: #333;
  margin-top: 0;
}

.document-category {
  margin-bottom: 2rem;
}

.document-category h4 {
  color: #333;
  margin: 0 0 0.75rem 0;
  font-size: 15px;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.empty-items {
  padding: 2rem;
  background: #f9f9f9;
  border-radius: 4px;
  color: #666;
  text-align: center;
}

.items-list {
  display: grid;
  gap: 1rem;
}

.item-card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}
</style>
