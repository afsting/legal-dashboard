/**
 * INTENT: Load and apply law firm branding (name, logo, colour theme).
 * Fetches from GET /api/settings/branding (public endpoint, no auth needed).
 * Caches result in localStorage so the login page can show the logo on repeat visits.
 * Applies theme colours as CSS custom properties on the document root.
 */

import { ref } from 'vue'
import api from '../utils/api'

const CACHE_KEY = 'legalDashboardBranding'

// ---------------------------------------------------------------------------
// Theme palette — five presets applied via CSS custom properties
// ---------------------------------------------------------------------------
export const THEMES = {
  purple:  { primary: '#667eea', secondary: '#764ba2', label: 'Purple (Default)' },
  blue:    { primary: '#1a73e8', secondary: '#1557b0', label: 'Blue' },
  green:   { primary: '#2e7d32', secondary: '#1b5e20', label: 'Green' },
  navy:    { primary: '#1a237e', secondary: '#283593', label: 'Navy' },
  charcoal:{ primary: '#37474f', secondary: '#263238', label: 'Charcoal' },
  crimson: { primary: '#c62828', secondary: '#7f0000', label: 'Crimson' },
}

// Shared reactive state (module-level singleton so all components share one instance)
const branding = ref(loadFromCache())
const loading = ref(false)

function loadFromCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch {
    return {}
  }
}

function saveToCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable in private browsing — silently ignore
  }
}

/**
 * INTENT: Apply the selected theme's colours as CSS custom properties.
 * Falls back to purple (default) if theme is unknown.
 */
export function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES.purple
  document.documentElement.style.setProperty('--brand-primary', theme.primary)
  document.documentElement.style.setProperty('--brand-secondary', theme.secondary)
}

export function useBranding() {
  /**
   * Fetch branding from the API, apply theme, cache result.
   * Called once in App.vue on mount (and optionally after admin saves changes).
   */
  const fetchBranding = async () => {
    loading.value = true
    try {
      const data = await api.get('/settings/branding')
      branding.value = data
      saveToCache(data)
      applyTheme(data.theme)
    } catch (err) {
      // Non-fatal — use cached or defaults
      console.warn('Could not load branding:', err.message)
      applyTheme(branding.value?.theme)
    } finally {
      loading.value = false
    }
  }

  /**
   * Update firm name and/or theme. Admin only.
   * Input: { firmName?, theme? }
   */
  const updateBranding = async (updates) => {
    const data = await api.put('/settings/branding', updates)
    branding.value = { ...branding.value, ...data }
    saveToCache(branding.value)
    applyTheme(branding.value.theme)
    return data
  }

  /**
   * Get a presigned S3 PUT URL, upload the file, then refresh branding.
   * Input: File object from <input type="file">
   */
  const uploadLogo = async (file) => {
    const { uploadUrl } = await api.post('/settings/branding/logo-upload', {
      contentType: file.type,
    })

    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })

    // Refresh so logoUrl reflects the newly uploaded file
    await fetchBranding()
  }

  /**
   * Remove the logo from branding settings.
   */
  const removeLogo = async () => {
    const data = await api.delete('/settings/branding/logo')
    branding.value = { ...branding.value, ...data, logoUrl: undefined }
    saveToCache(branding.value)
  }

  return {
    branding,
    loading,
    fetchBranding,
    updateBranding,
    uploadLogo,
    removeLogo,
    THEMES,
  }
}
