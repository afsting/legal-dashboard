// Google Authentication Store
import { ref, computed } from 'vue'

const currentUser = ref(null)
const isAuthenticated = computed(() => currentUser.value !== null)

export function useAuth() {
  const getAllowedEmails = () => {
    // First check localStorage (allows Settings page to manage)
    const stored = localStorage.getItem('allowedEmails')
    if (stored) {
      return JSON.parse(stored)
    }
    
    // Fall back to environment variable
    const envEmails = import.meta.env.VITE_ALLOWED_EMAILS
    return envEmails ? envEmails.split(',').map(e => e.trim()) : []
  }

  const loginWithGoogle = (googleToken) => {
    try {
      // Decode JWT token (Google ID token)
      const payload = JSON.parse(atob(googleToken.split('.')[1]))
      
      const email = payload.email
      const allowedEmails = getAllowedEmails()
      
      // Check if email is in allowlist
      if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
        return { success: false, error: `Email ${email} is not authorized. Allowed emails: ${allowedEmails.join(', ')}` }
      }

      currentUser.value = {
        id: payload.sub,
        email: email,
        name: payload.name,
        picture: payload.picture,
        loginTime: new Date(),
        token: googleToken
      }
      localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
      return { success: true }
    } catch (error) {
      console.error('Auth error:', error)
      return { success: false, error: 'Invalid token: ' + error.message }
    }
  }

  const logout = () => {
    currentUser.value = null
    localStorage.removeItem('currentUser')
  }

  const initializeAuth = () => {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      currentUser.value = JSON.parse(stored)
    }
  }

  return {
    currentUser,
    isAuthenticated,
    loginWithGoogle,
    logout,
    initializeAuth
  }
}
