<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Legal Dashboard</h1>
      <p class="subtitle">Sign in with your account</p>
      
      <button @click="handleCognitoLogin" class="btn-cognito" :disabled="loading">
        <svg class="cognito-logo" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="4" fill="#FF9900" />
          <text x="20" y="26" text-anchor="middle" fill="white" font-size="20" font-weight="bold">AWS</text>
        </svg>
        {{ loading ? 'Signing in...' : 'Sign in with AWS' }}
      </button>

      <div class="providers">
        <button @click="handleGoogleLogin" class="btn-provider btn-google" :disabled="loading">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <button @click="handleFacebookLogin" class="btn-provider btn-facebook" :disabled="loading">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
          </svg>
          Sign in with Facebook
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <p class="footer-text">
        New to Legal Dashboard?
        <a href="https://aws.amazon.com/cognito/" target="_blank">Create an account with AWS</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getLoginUrl } from '../utils/cognito'

const loading = ref(false)
const error = ref('')

const handleCognitoLogin = async () => {
  loading.value = true
  try {
    error.value = ''
    const loginUrl = await getLoginUrl()
    // Redirect to Cognito hosted UI
    window.location.href = loginUrl
  } catch (err) {
    error.value = 'Failed to initiate login'
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  try {
    error.value = ''
    // For Google IdP, still use hosted UI with identity provider hint
    const loginUrl = await getLoginUrl()
    window.location.href = loginUrl + '&identity_provider=Google'
  } catch (err) {
    error.value = 'Failed to initiate Google login'
    loading.value = false
  }
}

const handleFacebookLogin = async () => {
  loading.value = true
  try {
    error.value = ''
    // For Facebook IdP, still use hosted UI with identity provider hint
    const loginUrl = await getLoginUrl()
    window.location.href = loginUrl + '&identity_provider=Facebook'
  } catch (err) {
    error.value = 'Failed to initiate Facebook login'
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

.subtitle {
  text-align: center;
  color: #999;
  margin-bottom: 30px;
  font-size: 14px;
}

.btn-cognito,
.btn-provider {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.btn-cognito {
  background: #FF9900;
  color: white;
}

.btn-cognito:hover:not(:disabled) {
  background: #ec8b00;
}

.btn-cognito svg {
  width: 20px;
  height: 20px;
}

.btn-provider {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-provider:hover:not(:disabled) {
  background: #efefef;
  border-color: #999;
}

.btn-provider svg {
  width: 18px;
  height: 18px;
}

.btn-cognito:disabled,
.btn-provider:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.providers {
  margin: 20px 0;
}

.error {
  color: #e74c3c;
  text-align: center;
  margin-top: 15px;
  font-size: 14px;
}

.footer-text {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 12px;
}

.footer-text a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.footer-text a:hover {
  text-decoration: underline;
}
</style>
