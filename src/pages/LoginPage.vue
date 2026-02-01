<template>
  <div class="login-container">
    <div class="login-card">
      <div class="header">
        <h1>Legal Dashboard</h1>
        <p class="subtitle">Client & Case Management</p>
      </div>
      
      <div id="google-signin-container" class="google-signin"></div>

      <p v-if="error" class="error-message">{{ error }}</p>
      <p class="info-note">Sign in with your Google account to continue</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/authStore'

const router = useRouter()
const { loginWithGoogle } = useAuth()
const error = ref('')

const initGoogleSignIn = () => {
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  
  script.onload = () => {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    })
    
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-container'),
      {
        theme: 'outline',
        size: 'large',
        text: 'signin_with'
      }
    )
  }
  
  document.head.appendChild(script)
}

const handleCredentialResponse = (response) => {
  error.value = ''
  console.log('Google response:', response)
  const result = loginWithGoogle(response.credential)
  console.log('Login result:', result)
  
  if (result.success) {
    router.push({ name: 'Dashboard' })
  } else {
    error.value = result.error || 'Authentication failed'
  }
}

onMounted(() => {
  initGoogleSignIn()
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #667eea;
}

h1 {
  margin: 0 0 0.3rem 0;
  color: #333;
  font-size: 32px;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.google-signin {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
}

:deep(.google-signin > div) {
  display: flex !important;
  justify-content: center !important;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin: 1rem 0 0 0;
  padding: 0.75rem;
  background: #f8d7da;
  border-radius: 4px;
}

.info-note {
  color: #999;
  font-size: 12px;
  margin: 1.5rem 0 0 0;
}
</style>
