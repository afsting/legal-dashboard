<template>
  <div>
    <button class="agent-chat-toggle" @click="toggleSidebar" v-if="!sidebarOpen">
      <span>Ask Legal Assistant</span>
    </button>
    <div class="agent-sidebar" v-if="sidebarOpen">
      <header>
        <span>Legal Assistant</span>
        <button @click="toggleSidebar">Close</button>
      </header>
      <div v-if="error" class="error-message">
        <strong>Error:</strong> {{ error }}
        <div v-if="errorDetails" class="error-code">{{ errorDetails.code || errorDetails.statusCode || 'Unknown error' }}</div>
      </div>
      <div class="agent-chat-history">
        <div v-for="(msg, idx) in messages" :key="idx" :class="msg.role">
          <strong v-if="msg.role==='user'">You:</strong>
          <strong v-else>Agent:</strong>
          <span>{{ msg.text }}</span>
        </div>
      </div>
      <form @submit.prevent="sendMessage">
        <input v-model="input" placeholder="Ask a question..." autocomplete="off" :disabled="loading" />
        <button type="submit" :disabled="loading">{{ loading ? 'Sending...' : 'Send' }}</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../utils/api'
const sidebarOpen = ref(false)
const input = ref('')
const messages = ref([])
const loading = ref(false)
const error = ref(null)
const errorDetails = ref(null)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

async function sendMessage() {
  if (!input.value.trim() || loading.value) return
  
  const userMessage = input.value
  messages.value.push({ role: 'user', text: userMessage })
  input.value = ''
  loading.value = true
  error.value = null
  errorDetails.value = null
  
  try {
    const data = await api.post('/agent/query', { query: userMessage })
    const agentText = data.answer || data.response || 'No response.'
    // Ensure we're getting a string, not an object
    const finalText = typeof agentText === 'string' ? agentText : JSON.stringify(agentText, null, 2)
    messages.value.push({ role: 'agent', text: finalText })
  } catch (err) {
    error.value = err.message
    errorDetails.value = err
    messages.value.push({ role: 'agent', text: `Error: ${err.message}` })
    console.error('Agent error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.agent-chat-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #2d3a4a;
  color: #fff;
  border-radius: 24px;
  padding: 12px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 1000;
}
.agent-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100vh;
  background: #fff;
  box-shadow: -2px 0 12px rgba(0,0,0,0.12);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}
.agent-sidebar header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #2d3a4a;
  color: #fff;
}
.agent-chat-history {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
.agent-chat-history .user {
  text-align: right;
  margin-bottom: 8px;
}
.agent-chat-history .agent {
  text-align: left;
  margin-bottom: 8px;
}
form {
  display: flex;
  padding: 16px;
  border-top: 1px solid #eee;
}
input {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #ccc;
  margin-right: 8px;
}
button[type="submit"] {
  background: #2d3a4a;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}
button[type="submit"]:disabled {
  background: #999;
  cursor: not-allowed;
}
.error-message {
  padding: 8px 12px;
  background: #fff3cd;
  color: #664d03;
  border-bottom: 1px solid #ffecb5;
  font-size: 12px;
}
.error-code {
  margin-top: 4px;
  font-family: monospace;
  font-size: 11px;
  opacity: 0.8;
}
</style>
