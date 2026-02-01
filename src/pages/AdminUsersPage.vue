<template>
  <div class="admin-users-page">
    <header class="navbar">
      <h1>User Management</h1>
      <div class="nav-buttons">
        <router-link to="/dashboard" class="btn-secondary">← Dashboard</router-link>
        <button @click="logout" class="btn-logout">Logout</button>
      </div>
    </header>

    <main class="content">
      <!-- Pending Approvals Section -->
      <section class="section">
        <div class="section-header">
          <h2>Pending Approvals</h2>
          <span v-if="pendingUsers.length > 0" class="badge">{{ pendingUsers.length }}</span>
        </div>

        <div v-if="loading && pendingUsers.length === 0" class="loading-message">
          Loading pending users...
        </div>

        <div v-else-if="pendingUsers.length === 0" class="empty-state">
          <p>No pending user approvals</p>
        </div>

        <div v-else class="users-list">
          <div class="list-header">
            <div class="col-name">Name</div>
            <div class="col-email">Email</div>
            <div class="col-date">Registered</div>
            <div class="col-actions">Actions</div>
          </div>

          <div v-for="user in pendingUsers" :key="user.userId" class="list-row pending">
            <div class="col-name">
              <strong>{{ user.name }}</strong>
            </div>
            <div class="col-email">
              {{ user.email }}
            </div>
            <div class="col-date">
              {{ formatDate(user.createdAt) }}
            </div>
            <div class="col-actions">
              <button @click="handleApprove(user.userId)" class="btn-approve" :disabled="loading">
                ✓ Approve
              </button>
              <button @click="handleDelete(user.userId, user.name)" class="btn-delete" :disabled="loading">
                ✗ Reject
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- All Users Section -->
      <section class="section">
        <div class="section-header">
          <h2>All Users</h2>
          <span class="badge">{{ users.length }}</span>
        </div>

        <div v-if="loading && users.length === 0" class="loading-message">
          Loading users...
        </div>

        <div v-else-if="users.length === 0" class="empty-state">
          <p>No users found</p>
        </div>

        <div v-else class="users-list">
          <div class="list-header">
            <div class="col-name">Name</div>
            <div class="col-email">Email</div>
            <div class="col-role">Role</div>
            <div class="col-status">Status</div>
            <div class="col-date">Approved</div>
            <div class="col-actions">Actions</div>
          </div>

          <div v-for="user in users" :key="user.userId" class="list-row">
            <div class="col-name">
              <strong>{{ user.name }}</strong>
            </div>
            <div class="col-email">
              {{ user.email }}
            </div>
            <div class="col-role">
              <select 
                v-model="user.role" 
                @change="handleRoleChange(user.userId, user.role)"
                :disabled="loading || user.email === currentUser?.email"
                class="role-select"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="col-status">
              <span class="status-badge" :class="user.approved ? 'approved' : 'pending'">
                {{ user.approved ? 'Approved' : 'Pending' }}
              </span>
            </div>
            <div class="col-date">
              {{ user.approvedAt ? formatDate(user.approvedAt) : '-' }}
            </div>
            <div class="col-actions">
              <button 
                @click="handleDelete(user.userId, user.name)" 
                class="btn-delete-small" 
                :disabled="loading || user.email === currentUser?.email"
                title="Delete user"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal-content" @click.stop>
        <h2>Confirm Delete</h2>
        <p>Are you sure you want to delete <strong>{{ userToDelete?.name }}</strong>?</p>
        <p class="warning">This action cannot be undone.</p>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="btn-secondary">Cancel</button>
          <button @click="confirmDelete" class="btn-delete">Delete User</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/authStore'
import { useAdmin } from '../composables/useAdmin'

const router = useRouter()
const { currentUser, logout: authLogout } = useAuth()
const { users, pendingUsers, loading, error, fetchAllUsers, fetchPendingUsers, approveUser, deleteUser, updateUserRole } = useAdmin()

const showDeleteConfirm = ref(false)
const userToDelete = ref(null)

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const handleApprove = async (userId) => {
  try {
    await approveUser(userId)
    // Refresh lists
    await Promise.all([fetchPendingUsers(), fetchAllUsers()])
  } catch (err) {
    console.error('Error approving user:', err)
    alert('Failed to approve user')
  }
}

const handleDelete = (userId, userName) => {
  userToDelete.value = { userId, name: userName }
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  try {
    await deleteUser(userToDelete.value.userId)
    showDeleteConfirm.value = false
    userToDelete.value = null
  } catch (err) {
    console.error('Error deleting user:', err)
    alert('Failed to delete user')
  }
}

const handleRoleChange = async (userId, newRole) => {
  try {
    await updateUserRole(userId, newRole)
  } catch (err) {
    console.error('Error updating role:', err)
    alert('Failed to update user role')
    // Refresh to revert the change
    await fetchAllUsers()
  }
}

const logout = () => {
  authLogout()
  router.push('/login')
}

onMounted(async () => {
  // Check if user is admin
  if (currentUser.value?.role !== 'admin') {
    alert('Admin access required')
    router.push('/dashboard')
    return
  }

  try {
    await Promise.all([fetchPendingUsers(), fetchAllUsers()])
  } catch (err) {
    console.error('Error loading users:', err)
  }
})
</script>

<style scoped>
.admin-users-page {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.navbar {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-logout {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-logout:hover {
  background: #c82333;
}

.content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.loading-message {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.users-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.list-header {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr 1fr 1.2fr 1.2fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.list-row {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr 1fr 1.2fr 1.2fr;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  transition: background 0.2s;
}

.list-row:hover {
  background: #f8f9ff;
}

.list-row:last-child {
  border-bottom: none;
}

.list-row.pending {
  background: #fffbea;
}

.list-row.pending:hover {
  background: #fff4d1;
}

.col-name strong {
  color: #333;
}

.col-email {
  color: #666;
  font-size: 14px;
}

.col-date {
  color: #666;
  font-size: 13px;
}

.col-role {
  font-size: 13px;
}

.role-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.role-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.col-status {
  font-size: 13px;
}

.status-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.approved {
  background: #28a745;
  color: white;
}

.status-badge.pending {
  background: #ffc107;
  color: #333;
}

.col-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-approve {
  padding: 0.5rem 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-approve:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.btn-approve:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-delete:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete-small {
  padding: 0.4rem 0.8rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-delete-small:hover:not(:disabled) {
  background: #c82333;
}

.btn-delete-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.modal-content h2 {
  margin-top: 0;
  color: #333;
}

.modal-content p {
  color: #666;
  line-height: 1.6;
}

.modal-content .warning {
  color: #dc3545;
  font-weight: 600;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.modal-actions button {
  flex: 1;
  padding: 0.75rem;
  font-size: 14px;
  font-weight: 600;
}
</style>
