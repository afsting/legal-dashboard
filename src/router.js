import { createRouter, createWebHistory } from 'vue-router'
import { fetchAuthSession } from 'aws-amplify/auth'

const routes = [
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

// Auth is handled by the Amplify <Authenticator> in App.vue.
// This guard only enforces admin-only routes.
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAdmin) {
    try {
      const session = await fetchAuthSession()
      const groups = session.tokens?.idToken?.payload['cognito:groups'] || []
      if (!groups.includes('admin')) {
        next({ name: 'Dashboard' })
        return
      }
    } catch {
      next({ name: 'Dashboard' })
      return
    }
  }
  next()
})

export default router
