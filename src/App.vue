<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Authenticator } from '@aws-amplify/ui-vue'
import { fetchAuthSession } from 'aws-amplify/auth'
import '@aws-amplify/ui-vue/styles.css'
import AgentSidebar from './components/AgentSidebar.vue'

const route = useRoute()

// Store user groups from token
const userGroups = ref([])
const groupsLoaded = ref(false)
const currentUser = ref(null)

// Fetch user groups from Cognito token
const fetchUserGroups = async () => {
  try {
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken
    if (idToken) {
      const groups = idToken.payload['cognito:groups'] || []
      userGroups.value = groups
      groupsLoaded.value = true
      return groups
    } else {
      groupsLoaded.value = true
    }
  } catch (error) {
    console.error('❌ Error fetching auth session:', error)
    groupsLoaded.value = true
  }
  return []
}

// Watch currentUser and fetch groups when user logs in
watch(currentUser, async (newUser) => {
  if (newUser) {
    await fetchUserGroups()
  }
})

// Fetch groups on mount (when user is already signed in)
onMounted(async () => {
  await fetchUserGroups()
})

// Also fetch when route changes (ensures fresh data)
watch(() => route.path, async () => {
  await fetchUserGroups()
})

// User permission helpers
const getUserGroups = (user) => {
  return userGroups.value
}

// Update current user when available from Authenticator
const setCurrentUser = (user) => {
  if (user && user !== currentUser.value) {
    currentUser.value = user
    // Fetch groups in the background
    fetchUserGroups()
  }
  return true
}

const checkIsAdmin = (user) => {
  if (!user) return false
  const groups = getUserGroups(user)
  const isUserAdmin = groups.includes('admin') || groups.includes('Admin')
  return isUserAdmin
}

const checkIsStaff = (user) => {
  if (!user) return false
  const groups = getUserGroups(user)
  const isUserStaff = groups.includes('staff') || groups.includes('Staff') || checkIsAdmin(user)
  return isUserStaff
}

const checkIsApproved = (user) => {
  if (!user) return false
  const groups = getUserGroups(user)
  return groups.includes('approved') || groups.includes('Approved') || checkIsStaff(user)
}

const canAccessDashboard = (user) => {
  return checkIsApproved(user)
}
</script>

<template>
  <authenticator :social-providers="['google']">
    <template v-slot="{ user, signOut }">
      <div class="app" v-if="user && setCurrentUser(user)">
        <!-- Navigation Header -->
        <header class="app-header">
          <div class="header-content">
            <div class="header-left">
              <h1 class="app-title" @click="$router.push('/')">⚖️ Legal Dashboard</h1>
              <nav class="main-nav">
                <button 
                  class="nav-link" 
                  :class="{ active: route.path === '/dashboard' || route.path === '/' }"
                  @click="$router.push('/dashboard')"
                >
                  Dashboard
                </button>
                <button
                  class="nav-link"
                  :class="{ active: route.path.startsWith('/clients') }"
                  @click="$router.push('/clients')"
                >
                  Clients
                </button>
                <button 
                  v-if="groupsLoaded && checkIsAdmin(user)"
                  class="nav-link" 
                  :class="{ active: route.path.startsWith('/admin') }"
                  @click="$router.push('/admin/users')"
                >
                  Admin
                </button>
                <button 
                  class="nav-link" 
                  :class="{ active: route.path === '/settings' }"
                  @click="$router.push('/settings')"
                >
                  Settings
                </button>
              </nav>
            </div>
            <div class="header-right">
              <span class="user-info">
                <span class="user-role" v-if="groupsLoaded">
                  {{ checkIsAdmin(user) ? '👑 Admin' : checkIsStaff(user) ? '⭐ Staff' : checkIsApproved(user) ? '✓ Approved' : '👤 User' }}
                </span>
                <span class="user-role" v-else>
                  ⏳ Loading...
                </span>
                <span class="user-email">{{ user.signInDetails?.loginId || user.username || 'User' }}</span>
              </span>
              <button @click="signOut" class="sign-out-btn">Sign Out</button>
            </div>
          </div>
        </header>

        <div class="layout">
          <main class="main-content">
            <router-view 
              :user="user" 
              :sign-out="signOut" 
              :is-admin="checkIsAdmin(user)"
              :is-staff="checkIsStaff(user)"
              :is-approved="checkIsApproved(user)"
              :can-access-dashboard="canAccessDashboard(user)"
            />
          </main>
          <AgentSidebar />
        </div>
      </div>
    </template>
  </authenticator>
</template>

<style>
@import '@aws-amplify/ui-vue/styles.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}

#app {
  width: 100%;
}

.app {
  min-height: 100vh;
}

.app-header {
  background: white;
  border-bottom: 2px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1;
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
  cursor: pointer;
  transition: transform 0.2s;
}

.app-title:hover {
  transform: scale(1.05);
}

.main-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  background: transparent;
  border: none;
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f0f0f0;
}

.nav-link.active {
  background: #667eea;
  color: white;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.user-role {
  font-size: 0.85rem;
  font-weight: 600;
  color: #667eea;
}

.user-email {
  font-size: 0.9rem;
  color: #666;
}

.sign-out-btn {
  background: transparent;
  border: 2px solid #e0e0e0;
  padding: 0.5rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.sign-out-btn:hover {
  background: #f0f0f0;
  border-color: #667eea;
}

.layout {
  display: flex;
  min-height: calc(100vh - 80px);
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.main-content {
  flex: 1;
  overflow-x: hidden;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
  }

  .header-left {
    flex-direction: column;
    width: 100%;
    gap: 1rem;
  }

  .main-nav {
    width: 100%;
    justify-content: center;
  }

  .nav-link {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .user-info {
    align-items: flex-start;
  }

  .layout {
    flex-direction: column;
  }
}
</style>
