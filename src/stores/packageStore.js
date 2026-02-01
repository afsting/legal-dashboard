// Package Store for managing demand packages within file numbers
import { ref } from 'vue'
import { useClientStore } from './clientStore'

const packages = ref([])

export function usePackageStore() {
  const addPackage = (clientId, fileNumberId, packageData) => {
    const newPackage = {
      id: Math.random().toString(36).substr(2, 9),
      clientId,
      fileNumberId,
      ...packageData,
      status: 'draft',
      createdAt: new Date(),
      documents: {
        medicalRecords: [],    // Required
        accidentReports: [],   // Optional
        photographs: []        // Optional
      }
    }
    packages.value.push(newPackage)
    
    // Also add to file number in client store
    const { getFileNumberById } = useClientStore()
    const fileNumber = getFileNumberById(clientId, fileNumberId)
    if (fileNumber) {
      fileNumber.demandPackages.push(newPackage.id)
    }
    
    return newPackage
  }

  const getPackageById = (id) => {
    return packages.value.find(p => p.id === id)
  }

  const getPackagesByFileNumber = (clientId, fileNumberId) => {
    return packages.value.filter(p => p.clientId === clientId && p.fileNumberId === fileNumberId)
  }

  const updatePackage = (id, updates) => {
    const pkg = getPackageById(id)
    if (pkg) {
      Object.assign(pkg, updates)
    }
    return pkg
  }

  const deletePackage = (id) => {
    const index = packages.value.findIndex(p => p.id === id)
    if (index > -1) {
      packages.value.splice(index, 1)
    }
  }

  const updatePackageStatus = (id, status) => {
    const pkg = getPackageById(id)
    if (pkg) {
      pkg.status = status
      pkg.updatedAt = new Date()
    }
    return pkg
  }

  const addDocument = (packageId, category, document) => {
    const pkg = getPackageById(packageId)
    if (pkg && pkg.documents[category]) {
      pkg.documents[category].push(document)
      pkg.updatedAt = new Date()
    }
    return pkg
  }

  const removeDocument = (packageId, category, index) => {
    const pkg = getPackageById(packageId)
    if (pkg && pkg.documents[category]) {
      pkg.documents[category].splice(index, 1)
      pkg.updatedAt = new Date()
    }
    return pkg
  }

  return {
    packages,
    addPackage,
    getPackageById,
    getPackagesByFileNumber,
    updatePackage,
    deletePackage,
    updatePackageStatus,
    addDocument,
    removeDocument
  }
}
