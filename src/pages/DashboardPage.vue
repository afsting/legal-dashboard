<template>
  <div class="dashboard">
    <main class="content">
      <div class="welcome-banner">
        <h2>Welcome back</h2>
        <p>Manage clients, cases, and documents from one workspace</p>
      </div>

      <div class="dashboard-grid">
        <router-link :to="{ name: 'Clients' }" class="dashboard-card">
          <div class="card-icon">👥</div>
          <h3>Client Management</h3>
          <p>View and manage all your clients</p>
          <div class="card-footer">
            <span class="btn-link">Go to Clients →</span>
          </div>
        </router-link>

        <router-link v-if="isAdmin" :to="{ name: 'AdminUsers' }" class="dashboard-card admin-card">
          <div class="card-icon">👤</div>
          <h3>User Management</h3>
          <p>Approve and manage user accounts</p>
          <div class="card-footer">
            <span class="btn-link">Manage Users →</span>
          </div>
        </router-link>

        <div class="dashboard-card coming-soon">
          <div class="card-icon">📦</div>
          <h3>Demand Packages</h3>
          <p>Create and manage demand packages</p>
          <div class="card-footer">
            <span class="coming-soon-badge">Coming Soon</span>
          </div>
        </div>

        <div class="dashboard-card coming-soon">
          <div class="card-icon">📄</div>
          <h3>Documents</h3>
          <p>Upload and organize case documents</p>
          <div class="card-footer">
            <span class="coming-soon-badge">Coming Soon</span>
          </div>
        </div>

        <div class="dashboard-card coming-soon">
          <div class="card-icon">📊</div>
          <h3>Reports</h3>
          <p>View analytics and insights</p>
          <div class="card-footer">
            <span class="coming-soon-badge">Coming Soon</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
defineProps(['isAdmin'])
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #f5f5f5;
}


.content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.welcome-banner h2 {
  margin: 0 0 0.5rem 0;
  font-size: 32px;
  font-weight: 700;
}

.welcome-banner p {
  margin: 0;
  font-size: 18px;
  opacity: 0.9;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.dashboard-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.dashboard-card:not(.coming-soon):hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

.admin-card:hover {
  box-shadow: 0 8px 16px rgba(102, 16, 242, 0.2);
}

.dashboard-card.coming-soon {
  opacity: 0.6;
  cursor: default;
}

.card-icon {
  font-size: 48px;
  margin-bottom: 1rem;
}

.dashboard-card h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 22px;
}

.dashboard-card p {
  margin: 0;
  color: #666;
  font-size: 14px;
  flex-grow: 1;
}

.card-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.btn-link {
  color: #667eea;
  font-weight: 600;
  font-size: 14px;
}

.coming-soon-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #ffc107;
  color: #333;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
</style>
