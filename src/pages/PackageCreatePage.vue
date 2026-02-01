<template>
  <div class="package-create">
    <header class="navbar">
      <h1>Create New Demand Package</h1>
      <router-link v-if="$route.params.clientId && $route.params.fileNumberId" :to="`/client/${$route.params.clientId}/file/${$route.params.fileNumberId}/packages`" class="btn-secondary">Back to Packages</router-link>
      <router-link v-else to="/" class="btn-secondary">Back to Dashboard</router-link>
    </header>

    <main class="content">
      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-section">
          <h2>Package Details</h2>

          <div class="form-group">
            <label for="name">Package Name *</label>
            <input 
              v-model="formData.name" 
              id="name"
              type="text" 
              placeholder="Enter package name"
              required
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              v-model="formData.description" 
              id="description"
              placeholder="Enter package description"
              rows="4"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="recipient">Recipient *</label>
            <input 
              v-model="formData.recipient" 
              id="recipient"
              type="text" 
              placeholder="Enter recipient name/firm"
              required
            />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Create Package</button>
            <button type="button" @click="handleCancel" class="btn-secondary">Cancel</button>
          </div>

          <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePackageStore } from '../stores/packageStore'

const router = useRouter()
const route = useRoute()
const { addPackage } = usePackageStore()

const formData = ref({
  name: '',
  description: '',
  recipient: ''
})

const successMessage = ref('')
const errorMessage = ref('')

const handleSubmit = () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!formData.value.name || !formData.value.recipient) {
    errorMessage.value = 'Please fill in all required fields'
    return
  }

  try {
    const clientId = route.params.clientId
    const fileNumberId = route.params.fileNumberId

    if (!clientId || !fileNumberId) {
      errorMessage.value = 'Missing client or file number context'
      return
    }

    const newPackage = addPackage(clientId, fileNumberId, formData.value)
    successMessage.value = 'Package created successfully!'
    setTimeout(() => {
      router.push({ name: 'PackageDetail', params: { id: newPackage.id } })
    }, 500)
  } catch (error) {
    errorMessage.value = 'Error creating package. Please try again.'
  }
}

const handleCancel = () => {
  if (route.params.clientId && route.params.fileNumberId) {
    router.push(`/client/${route.params.clientId}/file/${route.params.fileNumberId}/packages`)
  } else {
    router.push({ name: 'Dashboard' })
  }
}
</script>

<style scoped>
.package-create {
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
  display: inline-block;
}

.btn-secondary:hover {
  background: #5a6268;
}

.content {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-section h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #667eea;
  padding-bottom: 1rem;
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

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary {
  flex: 1;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
}

.success-message {
  color: #28a745;
  margin-top: 1rem;
  text-align: center;
}

.error-message {
  color: #dc3545;
  margin-top: 1rem;
  text-align: center;
}
</style>
