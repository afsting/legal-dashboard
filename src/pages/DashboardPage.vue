<template>
  <div class="dashboard">
    <header class="navbar">
      <h1>Demand Packages</h1>
      <div class="user-menu">
        <span>{{ currentUser.email }}</span>
        <router-link to="/settings" class="btn-settings">Settings</router-link>
        <button @click="handleLogout" class="btn-logout">Logout</button>
      </div>
    </header>

    <main class="content">
      <div class="dashboard-header">
        <h2>Package Management</h2>
        <router-link to="/package/create" class="btn-primary">+ New Package</router-link>
      </div>

      <div v-if="packages.length === 0" class="empty-state">
        <p>No packages yet. Create your first demand package to get started.</p>
      </div>

      <div v-else class="packages-grid">
        <div v-for="pkg in packages" :key="pkg.id" class="package-card">
          <div class="card-header">
            <h3>{{ pkg.name }}</h3>
            <span class="status-badge" :class="pkg.status">{{ pkg.status }}</span>
          </div>
          <p class="card-description">{{ pkg.description }}</p>
          <div class="card-meta">
            <small>Created: {{ formatDate(pkg.createdAt) }}</small>
          </div>
          <div class="card-actions">
            <router-link :to="`/package/${pkg.id}`" class="btn-link">View Details</router-link>
            <router-link :to="`/package/${pkg.id}/workflow`" class="btn-link">Document Checklist</router-link>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/authStore'
import { usePackageStore } from '../stores/packageStore'

const router = useRouter()
const { currentUser, logout } = useAuth()
const { packages } = usePackageStore()

const handleLogout = () => {
  logout()
  router.push({ name: 'Login' })
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

onMounted(() => {
  // Initialize auth to ensure user is loaded
  const { initializeAuth } = useAuth()
  initializeAuth()
})
</script>

<style scoped>
.dashboard {
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

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  margin: 0;
  color: #333;
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
</style>
