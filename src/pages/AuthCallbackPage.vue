<template>
  <div class="callback-container">
    <div v-if="loading" class="loading">
      <p>Completing authentication...</p>
    </div>
    <div v-else-if="error" class="error-box">
      <h2>Authentication Error</h2>
      <p>{{ error }}</p>
      <router-link to="/login" class="btn-link">Back to Login</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { exchangeCodeForTokens, getUserFromToken } from '../utils/cognito'
import { useAuth } from '../stores/authStore'

const router = useRouter()
const route = useRoute()
const { setCognitoTokens, setCurrentUser } = useAuth()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const code = route.query.code
    const state = route.query.state

    if (!code) {
      throw new Error('No authorization code received')
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code)

    if (!tokenData.id_token) {
      throw new Error('No ID token received')
    }

    // Extract user info from ID token
    const user = getUserFromToken(tokenData.id_token)

    // Store tokens and user info
    setCognitoTokens({
      accessToken: tokenData.access_token,
      idToken: tokenData.id_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    })

    setCurrentUser(user)

    // Redirect to dashboard
    router.replace({ name: 'Dashboard' })
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = err.message || 'Authentication failed. Please try again.'
    loading.value = false
  }
})
</script>

<style scoped>
.callback-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading,
.error-box {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
}

.loading p {
  color: #666;
  margin: 0;
}

.error-box h2 {
  color: #e74c3c;
  margin-top: 0;
}

.error-box p {
  color: #666;
  margin-bottom: 20px;
}

.btn-link {
  display: inline-block;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-link:hover {
  background: #5568d3;
}
</style>
