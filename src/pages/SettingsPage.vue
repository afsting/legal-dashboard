<template>
  <div class="settings-page">
    <header class="navbar">
      <h1>Settings</h1>
      <router-link :to="{ name: 'Dashboard' }" class="btn-secondary">Back to Dashboard</router-link>
    </header>

    <main class="content">
      <div class="settings-container">
        <section class="settings-section">
          <h2>Allowed Emails</h2>
          <p class="section-desc">Manage which email addresses can access this application</p>

          <div class="form-group">
            <label for="new-email">Add Email Address</label>
            <div class="email-input-group">
              <input 
                v-model="newEmail" 
                id="new-email"
                type="email"
                placeholder="example@example.com"
              />
              <button @click="addEmail" class="btn-add">Add</button>
            </div>
            <p v-if="addError" class="error-message">{{ addError }}</p>
            <p v-if="addSuccess" class="success-message">{{ addSuccess }}</p>
          </div>

          <div class="allowed-emails-list">
            <h3>Current Allowed Emails</h3>
            <div v-if="allowedEmails.length === 0" class="empty-list">
              <p>No emails configured yet. Add your email to get started.</p>
            </div>
            <div v-else class="email-items">
              <div v-for="(email, index) in allowedEmails" :key="index" class="email-item">
                <span>{{ email }}</span>
                <button @click="removeEmail(index)" class="btn-remove">Remove</button>
              </div>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2>Current User</h2>
          <div class="user-info">
            <p><strong>Name:</strong> {{ currentUser.name }}</p>
            <p><strong>Email:</strong> {{ currentUser.email }}</p>
            <p><strong>Logged in:</strong> {{ formatDate(currentUser.loginTime) }}</p>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/authStore'

const router = useRouter()
const { currentUser, initializeAuth } = useAuth()

const allowedEmails = ref([])
const newEmail = ref('')
const addError = ref('')
const addSuccess = ref('')

const formatDate = (date) => {
  return new Date(date).toLocaleString()
}

const loadAllowedEmails = () => {
  const stored = localStorage.getItem('allowedEmails')
  if (stored) {
    allowedEmails.value = JSON.parse(stored)
  } else {
    // Load from environment if available
    const envEmails = import.meta.env.VITE_ALLOWED_EMAILS
    if (envEmails) {
      allowedEmails.value = envEmails.split(',').map(e => e.trim())
    }
  }
}

const addEmail = () => {
  addError.value = ''
  addSuccess.value = ''

  if (!newEmail.value.trim()) {
    addError.value = 'Please enter an email address'
    return
  }

  if (!isValidEmail(newEmail.value)) {
    addError.value = 'Please enter a valid email address'
    return
  }

  if (allowedEmails.value.includes(newEmail.value)) {
    addError.value = 'This email is already in the list'
    return
  }

  allowedEmails.value.push(newEmail.value)
  localStorage.setItem('allowedEmails', JSON.stringify(allowedEmails.value))
  addSuccess.value = `${newEmail.value} has been added`
  newEmail.value = ''
  
  setTimeout(() => {
    addSuccess.value = ''
  }, 3000)
}

const removeEmail = (index) => {
  const email = allowedEmails.value[index]
  if (confirm(`Remove ${email} from allowed emails?`)) {
    allowedEmails.value.splice(index, 1)
    localStorage.setItem('allowedEmails', JSON.stringify(allowedEmails.value))
  }
}

const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

onMounted(() => {
  initializeAuth()
  loadAllowedEmails()
})
</script>

<style scoped>
.settings-page {
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
  max-width: 800px;
  margin: 0 auto;
}

.settings-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.settings-section {
  padding: 2rem;
  border-bottom: 1px solid #eee;
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 18px;
}

.section-desc {
  color: #666;
  font-size: 14px;
  margin: 0 0 1.5rem 0;
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

.email-input-group {
  display: flex;
  gap: 0.5rem;
}

input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-add {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  white-space: nowrap;
}

.btn-add:hover {
  transform: translateY(-2px);
}

.error-message {
  color: #dc3545;
  font-size: 13px;
  margin: 0.5rem 0 0 0;
}

.success-message {
  color: #28a745;
  font-size: 13px;
  margin: 0.5rem 0 0 0;
}

.allowed-emails-list {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.allowed-emails-list h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 16px;
}

.empty-list {
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 4px;
  color: #666;
  text-align: center;
}

.email-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.email-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.email-item span {
  color: #333;
  font-family: monospace;
}

.btn-remove {
  padding: 0.4rem 0.8rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-remove:hover {
  background: #c82333;
}

.user-info {
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 4px;
}

.user-info p {
  margin: 0.5rem 0;
  color: #333;
}

.user-info strong {
  color: #333;
}
</style>
