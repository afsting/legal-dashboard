<template>
  <div class="admin-branding-page">
    <header class="navbar">
      <h1>Branding</h1>
      <div class="nav-buttons">
        <router-link :to="{ name: 'AdminUsers' }" class="btn-secondary">← Users</router-link>
        <router-link :to="{ name: 'Dashboard' }" class="btn-secondary">Dashboard</router-link>
      </div>
    </header>

    <main class="content">
      <div v-if="loadError" class="error-banner">{{ loadError }}</div>

      <!-- Firm Name -->
      <section class="card">
        <h2>Firm Name</h2>
        <p class="section-desc">Displayed in the navigation bar and browser tab.</p>
        <div class="field-row">
          <input
            v-model="firmNameInput"
            type="text"
            placeholder="e.g. Smith & Associates"
            maxlength="100"
            class="text-input"
          />
          <button @click="saveFirmName" :disabled="saving" class="btn-primary">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
        <p v-if="firmNameMsg" :class="firmNameMsg.type === 'error' ? 'msg-error' : 'msg-success'">
          {{ firmNameMsg.text }}
        </p>
      </section>

      <!-- Colour Theme -->
      <section class="card">
        <h2>Colour Theme</h2>
        <p class="section-desc">Applies to the navigation bar, buttons, and active links.</p>
        <div class="theme-grid">
          <button
            v-for="(theme, key) in THEMES"
            :key="key"
            class="theme-swatch"
            :class="{ active: selectedTheme === key }"
            :style="{ '--swatch': theme.primary }"
            @click="selectTheme(key)"
          >
            <span class="swatch-dot"></span>
            <span class="swatch-label">{{ theme.label }}</span>
          </button>
        </div>
        <button @click="saveTheme" :disabled="saving" class="btn-primary mt">
          {{ saving ? 'Saving…' : 'Apply Theme' }}
        </button>
        <p v-if="themeMsg" :class="themeMsg.type === 'error' ? 'msg-error' : 'msg-success'">
          {{ themeMsg.text }}
        </p>
      </section>

      <!-- Logo -->
      <section class="card">
        <h2>Firm Logo</h2>
        <p class="section-desc">
          Shown in the navigation bar and on the login page. PNG, JPG, SVG, or WebP. Max 2 MB.
        </p>

        <!-- Current logo preview -->
        <div v-if="branding.logoUrl" class="logo-preview">
          <img :src="branding.logoUrl" alt="Current firm logo" class="logo-img" />
          <button @click="handleRemoveLogo" :disabled="saving" class="btn-danger-sm">
            Remove Logo
          </button>
        </div>
        <p v-else class="no-logo">No logo uploaded yet.</p>

        <!-- Upload -->
        <label class="file-label">
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            @change="handleFileChange"
            class="file-input"
          />
          <span class="btn-secondary">Choose File</span>
          <span class="file-name">{{ selectedFile ? selectedFile.name : 'No file selected' }}</span>
        </label>

        <button
          v-if="selectedFile"
          @click="handleUpload"
          :disabled="uploading"
          class="btn-primary mt"
        >
          {{ uploading ? 'Uploading…' : 'Upload Logo' }}
        </button>

        <p v-if="logoMsg" :class="logoMsg.type === 'error' ? 'msg-error' : 'msg-success'">
          {{ logoMsg.text }}
        </p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBranding, applyTheme, THEMES } from '../composables/useBranding'

const { branding, fetchBranding, updateBranding, uploadLogo, removeLogo } = useBranding()

const firmNameInput = ref('')
const selectedTheme = ref('purple')
const selectedFile = ref(null)

const saving = ref(false)
const uploading = ref(false)
const loadError = ref('')

const firmNameMsg = ref(null)
const themeMsg = ref(null)
const logoMsg = ref(null)

onMounted(async () => {
  try {
    await fetchBranding()
    firmNameInput.value = branding.value.firmName || ''
    selectedTheme.value = branding.value.theme || 'purple'
  } catch (err) {
    loadError.value = 'Failed to load branding settings.'
  }
})

function showMsg(msgRef, type, text, duration = 3000) {
  msgRef.value = { type, text }
  setTimeout(() => { msgRef.value = null }, duration)
}

async function saveFirmName() {
  saving.value = true
  try {
    await updateBranding({ firmName: firmNameInput.value })
    showMsg(firmNameMsg, 'success', 'Firm name saved.')
  } catch (err) {
    showMsg(firmNameMsg, 'error', err.message || 'Failed to save.')
  } finally {
    saving.value = false
  }
}

function selectTheme(key) {
  selectedTheme.value = key
  applyTheme(key) // Preview immediately without saving
}

async function saveTheme() {
  saving.value = true
  try {
    await updateBranding({ theme: selectedTheme.value })
    showMsg(themeMsg, 'success', 'Theme applied.')
  } catch (err) {
    showMsg(themeMsg, 'error', err.message || 'Failed to save.')
  } finally {
    saving.value = false
  }
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    showMsg(logoMsg, 'error', 'File exceeds 2 MB limit.')
    return
  }
  selectedFile.value = file
  logoMsg.value = null
}

async function handleUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    await uploadLogo(selectedFile.value)
    selectedFile.value = null
    showMsg(logoMsg, 'success', 'Logo uploaded successfully.')
  } catch (err) {
    showMsg(logoMsg, 'error', err.message || 'Upload failed.')
  } finally {
    uploading.value = false
  }
}

async function handleRemoveLogo() {
  if (!confirm('Remove the current logo?')) return
  saving.value = true
  try {
    await removeLogo()
    showMsg(logoMsg, 'success', 'Logo removed.')
  } catch (err) {
    showMsg(logoMsg, 'error', err.message || 'Failed to remove logo.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.admin-branding-page {
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
  font-size: 24px;
  color: #333;
}

.nav-buttons {
  display: flex;
  gap: 0.75rem;
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
}

.btn-secondary:hover { background: #5a6268; }

.content {
  padding: 2rem;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-banner {
  background: #fdecea;
  color: #c62828;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #ef9a9a;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.75rem;
}

.card h2 {
  margin: 0 0 0.25rem;
  font-size: 18px;
  color: #333;
}

.section-desc {
  color: #666;
  font-size: 14px;
  margin: 0 0 1.25rem;
}

/* Firm name */
.field-row {
  display: flex;
  gap: 0.75rem;
}

.text-input {
  flex: 1;
  padding: 0.65rem 0.9rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 15px;
}

.text-input:focus {
  outline: none;
  border-color: var(--brand-primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.btn-primary {
  padding: 0.65rem 1.5rem;
  background: var(--brand-primary, #667eea);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.mt { margin-top: 1rem; }

/* Themes */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.theme-swatch {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.9rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: border-color 0.15s;
}

.theme-swatch:hover {
  border-color: var(--swatch);
}

.theme-swatch.active {
  border-color: var(--swatch);
  background: color-mix(in srgb, var(--swatch) 8%, white);
}

.swatch-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--swatch);
  flex-shrink: 0;
}

.swatch-label {
  font-weight: 500;
}

/* Logo */
.logo-preview {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #eee;
}

.logo-img {
  max-height: 60px;
  max-width: 200px;
  object-fit: contain;
}

.btn-danger-sm {
  padding: 0.4rem 0.9rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-danger-sm:hover:not(:disabled) { background: #c82333; }
.btn-danger-sm:disabled { opacity: 0.6; cursor: not-allowed; }

.no-logo {
  color: #999;
  font-size: 14px;
  margin-bottom: 1rem;
}

.file-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.file-input {
  display: none;
}

.file-name {
  font-size: 14px;
  color: #555;
}

/* Messages */
.msg-success {
  color: #2e7d32;
  font-size: 13px;
  margin-top: 0.5rem;
}

.msg-error {
  color: #c62828;
  font-size: 13px;
  margin-top: 0.5rem;
}
</style>
