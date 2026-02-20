import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/authStore'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('./pages/LoginPage.vue')
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('./pages/AuthCallbackPage.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('./pages/RegisterPage.vue')
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('./pages/DashboardPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('./pages/ClientsListPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:clientId',
    name: 'ClientDetail',
    component: () => import('./pages/ClientDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:clientId/file-numbers/:fileNumberId',
    name: 'FileNumberDetail',
    component: () => import('./pages/FileNumberDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:clientId/file-numbers/:fileNumberId/packages',
    name: 'DemandPackages',
    component: () => import('./pages/DemandPackagesPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:clientId/file-numbers/:fileNumberId/packages/create',
    name: 'PackageCreate',
    component: () => import('./pages/PackageCreatePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/packages/:packageId',
    name: 'PackageDetail',
    component: () => import('./pages/PackageDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./pages/SettingsPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('./pages/AdminUsersPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/packages/:packageId/workflow',
    name: 'Checklist',
    component: () => import('./pages/WorkflowPage.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const { isAuthenticated, currentUser, initializeAuth } = useAuth()
  initializeAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAdmin && !currentUser.value?.isAdmin && !currentUser.value?.groups?.includes('admin')) {
    next({ name: 'Dashboard' })
    return
  }

  if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated.value) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

export default router
