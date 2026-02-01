<template>
  <div class="file-number-detail">
    <header class="navbar">
      <h1>File Number: {{ fileNumber?.fileNumber || 'Loading...' }}</h1>
      <router-link :to="`/clients/${$route.params.clientId}`" class="btn-secondary">Back to Client</router-link>
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
            <div class="function-card disabled">
              <div class="function-icon">📦</div>
              <h4>Demand Packages</h4>
              <p>Create and manage demand packages for this case</p>
              <div class="function-badge">Coming Soon</div>
            </div>

            <!-- Document Management -->
            <div class="function-card disabled">
              <div class="function-icon">📄</div>
              <h4>Document Management</h4>
              <p>Organize and manage case documents</p>
              <div class="function-badge">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFileNumbers } from '../composables/useFileNumbers'

const route = useRoute()
const { currentFileNumber, loading, error, fetchFileNumberById } = useFileNumbers()

const fileNumber = ref(null)

onMounted(async () => {
  try {
    const data = await fetchFileNumberById(route.params.fileNumberId)
    fileNumber.value = data
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
</style>
