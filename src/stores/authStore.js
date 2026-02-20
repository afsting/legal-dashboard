// Cognito Authentication Store
import { ref, computed } from 'vue'
import api from '../utils/api'
import { isTokenExpired, getLogoutUrl } from '../utils/cognito'

const currentUser = ref(null)
const accessToken = ref(localStorage.getItem('accessToken'))
const idToken = ref(localStorage.getItem('idToken'))
const refreshToken = ref(localStorage.getItem('refreshToken'))
const tokenExpiration = ref(localStorage.getItem('tokenExpiration'))

const isAuthenticated = computed(() => {
  if (!accessToken.value || !idToken.value) return false
  
  try {
    return !isTokenExpired(idToken.value)
  } catch {
    return false
  }
})

export function useAuth() {
  // Set Cognito tokens after successful OAuth authentication
  const setCognitoTokens = (tokens) => {
    accessToken.value = tokens.accessToken
    idToken.value = tokens.idToken
    refreshToken.value = tokens.refreshToken
    
    const expiresIn = tokens.expiresIn || 3600
    const expirationTime = Date.now() + expiresIn * 1000
    tokenExpiration.value = expirationTime.toString()
    
    // Store in localStorage for persistence
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('idToken', tokens.idToken)
    localStorage.setItem('refreshToken', tokens.refreshToken || '')
    localStorage.setItem('tokenExpiration', expirationTime.toString())
    
    // Set auth header for API requests
    api.setAuthToken(tokens.accessToken)
  }

  // Set current user info
  const setCurrentUser = (user) => {
    currentUser.value = user
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  // Legacy login method (kept for backward compatibility)
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      if (response.token) {
        accessToken.value = response.token
        idToken.value = response.token // Legacy: use same token for both
        currentUser.value = response.user
        api.setAuthToken(response.token)
        localStorage.setItem('accessToken', response.token)
        localStorage.setItem('idToken', response.token)
        localStorage.setItem('currentUser', JSON.stringify(response.user))
        return { success: true }
      }
      return { success: false, error: 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  // Legacy register method
  const register = async (email, password, name) => {
    try {
      const response = await api.post('/auth/register', { email, password, name })
      return { success: true, message: response.message }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: error.message }
    }
  }

  // Logout from Cognito
  const logout = () => {
    currentUser.value = null
    accessToken.value = null
    idToken.value = null
    refreshToken.value = null
    tokenExpiration.value = null
    
    api.setAuthToken(null)
    
    localStorage.removeItem('accessToken')
    localStorage.removeItem('idToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('tokenExpiration')
    localStorage.removeItem('currentUser')
    
    // Redirect to Cognito logout URL
    const logoutUrl = getLogoutUrl()
    window.location.href = logoutUrl
  }

  // Initialize auth from stored tokens
  const initializeAuth = () => {
    const storedUser = localStorage.getItem('currentUser')
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedIdToken = localStorage.getItem('idToken')
    
    if (storedUser && storedAccessToken && storedIdToken) {
      try {
        // Check if token is expired
        if (!isTokenExpired(storedIdToken)) {
          currentUser.value = JSON.parse(storedUser)
          accessToken.value = storedAccessToken
          idToken.value = storedIdToken
          refreshToken.value = localStorage.getItem('refreshToken')
          tokenExpiration.value = localStorage.getItem('tokenExpiration')
          api.setAuthToken(storedAccessToken)
        } else {
          // Token expired, clear storage
          logout()
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        logout()
      }
    }
  }

  return {
    currentUser,
    accessToken,
    idToken,
    refreshToken,
    tokenExpiration,
    isAuthenticated,
    login,
    register,
    logout,
    initializeAuth,
    setCognitoTokens,
    setCurrentUser,
  }
}
