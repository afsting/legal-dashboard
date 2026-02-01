// JWT Authentication Store
import { ref, computed } from 'vue'
import api from '../utils/api'

const currentUser = ref(null)
const token = ref(localStorage.getItem('token'))
const isAuthenticated = computed(() => !!token.value)

export function useAuth() {
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      token.value = response.token
      currentUser.value = response.user
      api.setToken(response.token)
      localStorage.setItem('token', response.token)
      localStorage.setItem('currentUser', JSON.stringify(response.user))
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  const register = async (email, password, name) => {
    try {
      const response = await api.post('/auth/register', { email, password, name })
      // Registration now returns pending approval message, no token
      return { success: true, message: response.message }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    token.value = null
    currentUser.value = null
    api.setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
  }

  const initializeAuth = () => {
    const stored = localStorage.getItem('currentUser')
    const storedToken = localStorage.getItem('token')
    if (stored && storedToken) {
      currentUser.value = JSON.parse(stored)
      token.value = storedToken
      api.setToken(storedToken)
    }
  }

  return {
    currentUser,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    initializeAuth
  }
}
