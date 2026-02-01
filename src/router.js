import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/authStore'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('./pages/LoginPage.vue')
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('./pages/ClientsListPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/client/:clientId',
    name: 'ClientDetail',
    component: () => import('./pages/ClientDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/client/:clientId/file/:fileNumberId',
    name: 'FileNumberDetail',
    component: () => import('./pages/FileNumberDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/client/:clientId/file/:fileNumberId/packages',
    name: 'DemandPackages',
    component: () => import('./pages/DemandPackagesPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/client/:clientId/file/:fileNumberId/packages/create',
    name: 'CreatePackageWithContext',
    component: () => import('./pages/PackageCreatePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/package/create',
    name: 'CreatePackage',
    component: () => import('./pages/PackageCreatePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/package/:id',
    name: 'PackageDetail',
    component: () => import('./pages/PackageDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/package/:id/workflow',
    name: 'Checklist',
    component: () => import('./pages/WorkflowPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./pages/SettingsPage.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const { isAuthenticated, initializeAuth } = useAuth()
  initializeAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && isAuthenticated.value) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
