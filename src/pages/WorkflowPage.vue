<template>
  <div class="workflow-page">
    <header class="navbar">
      <h1>Package Checklist</h1>
      <router-link :to="`/package/${$route.params.id}`" class="btn-secondary">Back to Package</router-link>
    </header>

    <main class="content">
      <div v-if="!currentPackage" class="error-message">
        Package not found
      </div>

      <div v-else class="workflow-container">
        <h2>{{ currentPackage.name }} - Required Documents Checklist</h2>

        <div class="checklist-content">
          <!-- Medical Records Section (Required) -->
          <section class="checklist-section required">
            <div class="section-header">
              <h3>Medical Records <span class="required-badge">Required</span></h3>
              <p class="section-desc">Add all medical record documents for this demand package</p>
            </div>
            
            <div class="form-group">
              <input 
                v-model="newMedicalRecord" 
                type="text"
                placeholder="Enter medical record description or filename"
              />
              <button @click="addDocument('medicalRecords')" class="btn-small">Add</button>
            </div>

            <div v-if="currentPackage.documents.medicalRecords.length > 0" class="items-list">
              <div v-for="(item, index) in currentPackage.documents.medicalRecords" :key="index" class="item-row">
                <span>{{ item }}</span>
                <button @click="removeDocument('medicalRecords', index)" class="btn-remove">Remove</button>
              </div>
            </div>
            <p v-else class="empty-message">No medical records added yet</p>
          </section>

          <!-- Accident Reports Section (Optional) -->
          <section class="checklist-section">
            <div class="section-header">
              <h3>Accident Reports <span class="optional-badge">Optional</span></h3>
              <p class="section-desc">Add any accident report documents if applicable</p>
            </div>
            
            <div class="form-group">
              <input 
                v-model="newAccidentReport" 
                type="text"
                placeholder="Enter accident report description or filename"
              />
              <button @click="addDocument('accidentReports')" class="btn-small">Add</button>
            </div>

            <div v-if="currentPackage.documents.accidentReports.length > 0" class="items-list">
              <div v-for="(item, index) in currentPackage.documents.accidentReports" :key="index" class="item-row">
                <span>{{ item }}</span>
                <button @click="removeDocument('accidentReports', index)" class="btn-remove">Remove</button>
              </div>
            </div>
            <p v-else class="empty-message">No accident reports added</p>
          </section>

          <!-- Photographs Section (Optional) -->
          <section class="checklist-section">
            <div class="section-header">
              <h3>Photographs <span class="optional-badge">Optional</span></h3>
              <p class="section-desc">Add any relevant photographs</p>
            </div>
            
            <div class="form-group">
              <input 
                v-model="newPhotograph" 
                type="text"
                placeholder="Enter photograph description or filename"
              />
              <button @click="addDocument('photographs')" class="btn-small">Add</button>
            </div>

            <div v-if="currentPackage.documents.photographs.length > 0" class="items-list">
              <div v-for="(item, index) in currentPackage.documents.photographs" :key="index" class="item-row">
                <span>{{ item }}</span>
                <button @click="removeDocument('photographs', index)" class="btn-remove">Remove</button>
              </div>
            </div>
            <p v-else class="empty-message">No photographs added</p>
          </section>

          <!-- Status Update Section -->
          <section class="checklist-section status-section">
            <div class="section-header">
              <h3>Package Status</h3>
            </div>
            
            <div class="status-options">
              <label class="radio-option">
                <input 
                  v-model="newStatus" 
                  type="radio" 
                  value="in-progress"
                />
                <span>In Progress</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="newStatus" 
                  type="radio" 
                  value="completed"
                />
                <span>Completed</span>
              </label>
            </div>
          </section>

          <div class="checklist-actions">
            <button @click="saveAndReturn" class="btn-primary">Save & Return</button>
            <router-link :to="`/package/${currentPackage.id}`" class="btn-secondary">Cancel</router-link>
          </div>

          <p v-if="error" class="error-message">{{ error }}</p>
          <p v-if="success" class="success-message">{{ success }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePackageStore } from '../stores/packageStore'

const router = useRouter()
const route = useRoute()
const { getPackageById, updatePackageStatus, addDocument: addDocumentToStore, removeDocument: removeDocumentFromStore } = usePackageStore()

const currentPackage = ref(null)
const newMedicalRecord = ref('')
const newAccidentReport = ref('')
const newPhotograph = ref('')
const newStatus = ref('in-progress')
const error = ref('')
const success = ref('')

const addDocument = (category) => {
  error.value = ''
  success.value = ''
  
  let documentName = ''
  if (category === 'medicalRecords') {
    if (!newMedicalRecord.value.trim()) {
      error.value = 'Please enter a medical record description'
      return
    }
    documentName = newMedicalRecord.value
    newMedicalRecord.value = ''
  } else if (category === 'accidentReports') {
    if (!newAccidentReport.value.trim()) {
      error.value = 'Please enter an accident report description'
      return
    }
    documentName = newAccidentReport.value
    newAccidentReport.value = ''
  } else if (category === 'photographs') {
    if (!newPhotograph.value.trim()) {
      error.value = 'Please enter a photograph description'
      return
    }
    documentName = newPhotograph.value
    newPhotograph.value = ''
  }
  
  addDocumentToStore(route.params.id, category, documentName)
  success.value = 'Document added successfully'
  setTimeout(() => {
    success.value = ''
  }, 2000)
}

const removeDocument = (category, index) => {
  removeDocumentFromStore(route.params.id, category, index)
}

const saveAndReturn = () => {
  error.value = ''
  
  // Validate at least one medical record
  if (currentPackage.value.documents.medicalRecords.length === 0) {
    error.value = 'At least one medical record is required'
    return
  }
  
  updatePackageStatus(route.params.id, newStatus.value)
  router.push({ name: 'PackageDetail', params: { id: route.params.id } })
}

onMounted(() => {
  currentPackage.value = getPackageById(route.params.id)
  if (currentPackage.value) {
    newStatus.value = currentPackage.value.status
  }
})
</script>

<style scoped>
.workflow-page {
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

.content {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.error-message {
  color: #dc3545;
  padding: 1rem;
  margin-top: 1rem;
  background: #f8d7da;
  border-radius: 4px;
}

.workflow-container h2 {
  color: #333;
  margin-top: 0;
}

.checklist-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.checklist-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.checklist-section.required {
  border-left: 4px solid #dc3545;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.required-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #dc3545;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 3px;
  text-transform: uppercase;
}

.optional-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #6c757d;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 3px;
  text-transform: uppercase;
}

.section-desc {
  margin: 0;
  color: #666;
  font-size: 13px;
}

.status-section {
  border-left: 4px solid #667eea;
}

.checklist-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #eee;
}

.form-group {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn-small {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-small:hover {
  transform: translateY(-2px);
}

.items-list {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 4px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.item-row:last-child {
  border-bottom: none;
}

.btn-remove {
  padding: 0.25rem 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-remove:hover {
  background: #c82333;
}

.empty-message {
  color: #999;
  font-style: italic;
}

.status-options {
  margin: 1.5rem 0;
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 4px;
}

.radio-option {
  display: block;
  margin: 0.75rem 0;
  cursor: pointer;
  color: #333;
}

.radio-option input {
  margin-right: 0.5rem;
}

.status-note {
  margin-top: 1rem;
  color: #666;
}

.success-box {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 1.5rem;
  border-radius: 4px;
}

.success-box p {
  margin: 0.5rem 0;
}

.workflow-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
}
</style>
