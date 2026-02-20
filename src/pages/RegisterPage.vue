<template>
  <div class="register-container">
    <div class="register-box">
      <h1>Create Account</h1>
      
      <div v-if="registrationSuccess" class="success-message">
        <h2>✓ Account Created!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Please wait for admin approval before logging in.</strong></p>
        <p>You will be notified once your account is approved.</p>
        <router-link :to="{ name: 'Login' }" class="btn-primary">Go to Login</router-link>
      </div>

      <form v-else @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Name</label>
          <input v-model="name" type="text" required placeholder="Full Name" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" required placeholder="user@example.com" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" required placeholder="Password" />
        </div>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Creating Account...' : 'Register' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
        <p class="login-link">
          Already have an account?
          <router-link :to="{ name: 'Login' }">Login here</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/authStore'

const router = useRouter()
const { register } = useAuth()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const registrationSuccess = ref(false)

const handleRegister = async () => {
  error.value = ''
  loading.value = true
  try {
    const result = await register(email.value, password.value, name.value)
    if (result.success) {
      // Show success message instead of redirecting
      registrationSuccess.value = true
    } else {
      error.value = result.error || 'Registration failed'
    }
  } catch (err) {
    error.value = err.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-box {
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
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #e74c3c;
  margin-top: 15px;
  text-align: center;
}

.success-message {
  text-align: center;
  padding: 20px;
}

.success-message h2 {
  color: #28a745;
  margin-bottom: 15px;
  font-size: 24px;
}

.success-message p {
  color: #333;
  margin: 10px 0;
  line-height: 1.6;
}

.success-message strong {
  color: #667eea;
}

.success-message .btn-primary {
  margin-top: 20px;
  display: inline-block;
  text-decoration: none;
  padding: 12px 30px;
  width: auto;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.login-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
