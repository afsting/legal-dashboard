// Client Store for managing clients and file numbers
import { ref } from 'vue'

const clients = ref([])

export function useClientStore() {
  const addClient = (clientData) => {
    const newClient = {
      id: Math.random().toString(36).substr(2, 9),
      ...clientData,
      createdAt: new Date(),
      fileNumbers: []
    }
    clients.value.push(newClient)
    return newClient
  }

  const getClientById = (id) => {
    return clients.value.find(c => c.id === id)
  }

  const updateClient = (id, updates) => {
    const client = getClientById(id)
    if (client) {
      Object.assign(client, updates)
      client.updatedAt = new Date()
    }
    return client
  }

  const deleteClient = (id) => {
    const index = clients.value.findIndex(c => c.id === id)
    if (index > -1) {
      clients.value.splice(index, 1)
    }
  }

  // File Number Management
  const addFileNumber = (clientId, fileNumberData) => {
    const client = getClientById(clientId)
    if (client) {
      const newFileNumber = {
        id: Math.random().toString(36).substr(2, 9),
        ...fileNumberData,
        clientId,
        createdAt: new Date(),
        demandPackages: [],
        documents: []
      }
      client.fileNumbers.push(newFileNumber)
      client.updatedAt = new Date()
      return newFileNumber
    }
    return null
  }

  const getFileNumberById = (clientId, fileNumberId) => {
    const client = getClientById(clientId)
    if (client) {
      return client.fileNumbers.find(fn => fn.id === fileNumberId)
    }
    return null
  }

  const updateFileNumber = (clientId, fileNumberId, updates) => {
    const client = getClientById(clientId)
    if (client) {
      const fileNumber = client.fileNumbers.find(fn => fn.id === fileNumberId)
      if (fileNumber) {
        Object.assign(fileNumber, updates)
        fileNumber.updatedAt = new Date()
        client.updatedAt = new Date()
        return fileNumber
      }
    }
    return null
  }

  const deleteFileNumber = (clientId, fileNumberId) => {
    const client = getClientById(clientId)
    if (client) {
      const index = client.fileNumbers.findIndex(fn => fn.id === fileNumberId)
      if (index > -1) {
        client.fileNumbers.splice(index, 1)
        client.updatedAt = new Date()
      }
    }
  }

  return {
    clients,
    addClient,
    getClientById,
    updateClient,
    deleteClient,
    addFileNumber,
    getFileNumberById,
    updateFileNumber,
    deleteFileNumber
  }
}
