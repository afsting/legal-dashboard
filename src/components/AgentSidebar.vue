<template>
  <div>
    <!-- Chat toggle button - shown when sidebar closed -->
    <button class="agent-chat-toggle" @click="toggleSidebar" v-if="!sidebarOpen">
      <span>Ask Legal Assistant</span>
    </button>

    <!-- Chat sidebar - shown when open -->
    <div class="agent-sidebar" v-if="sidebarOpen">
      <header>
        <div class="header-title">
          <span>Legal Assistant</span>
          <span class="context-badge">{{ contextDescription }}</span>
        </div>
        <button @click="toggleSidebar">Close</button>
      </header>

      <!-- Error display -->
      <div v-if="error" class="error-message">
        <strong>Error:</strong> {{ error }}
        <div v-if="errorDetails" class="error-code">
          {{ errorDetails.code || errorDetails.statusCode || 'Unknown error' }}
        </div>
      </div>

      <!-- Message history -->
      <div class="agent-chat-history">
        <div v-for="(msg, idx) in messages" :key="idx" :class="msg.role">
          <strong v-if="msg.role === 'user'">You:</strong>
          <strong v-else>Agent:</strong>
          <span>{{ msg.text }}</span>
        </div>
      </div>

      <!-- Input form -->
      <form @submit.prevent="sendMessage">
        <input
          v-model="input"
          placeholder="Ask a question..."
          autocomplete="off"
          :disabled="loading"
        />
        <button type="submit" :disabled="loading">
          {{ loading ? 'Sending...' : 'Send' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * INTENT: Legal Assistant Chat Sidebar with Context Awareness
 * 
 * Purpose: Provide a modal chat interface for users to query the Bedrock agent
 * about legal documents. Automatically detects current page context (client/file number)
 * and includes it in queries. Manages conversation state, message history, and
 * error handling.
 * 
 * Features:
 * - Toggle sidebar open/closed
 * - Automatically detect and use current page context
 * - Send queries to agent endpoint with context
 * - Display message history (user and agent)
 * - Handle errors gracefully
 * - Show loading state while querying
 */

import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../utils/api'

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'agent'} role - Who sent the message
 * @property {string} text - Message content
 */

/**
 * @typedef {Object} AgentResponse
 * @property {string} answer - The agent's response text
 * @property {string} [response] - Alternative field name for response
 */

/**
 * @typedef {Object} PageContext
 * @property {string} [clientId] - Current client ID from route
 * @property {string} [fileNumberId] - Current file number ID from route
 */

// ============================================================================
// ROUTE & CONTEXT
// ============================================================================

const route = useRoute()

/**
 * Detects current page context from route parameters
 * Extracts clientId and fileNumberId if present on current page
 * 
 * @returns {PageContext} Current client and file number context
 */
function getPageContext() {
  return {
    clientId: route.params.clientId || null,
    fileNumberId: route.params.fileNumberId || null,
  }
}

/**
 * Current page context (reactive)
 * Updates automatically when route changes
 */
const pageContext = computed(() => getPageContext())

/**
 * Human-readable description of current context
 * Used for displaying what context is active
 */
const contextDescription = computed(() => {
  if (pageContext.value.fileNumberId) {
    return `File #${pageContext.value.fileNumberId}`
  }
  if (pageContext.value.clientId) {
    return `Client`
  }
  return 'General'
})

// ============================================================================
// REACTIVE STATE
// ============================================================================

const sidebarOpen = ref(false)
const input = ref('')
const messages = ref([])
const loading = ref(false)
const error = ref(null)
const errorDetails = ref(null)

// ============================================================================
// SIDEBAR MANAGEMENT
// ============================================================================

/**
 * Toggles the sidebar open/closed state
 */
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Adds a user message to the chat history
 * 
 * @param {string} text - User's message
 */
function addUserMessage(text) {
  messages.value.push({
    role: 'user',
    text,
  })
}

/**
 * Adds an agent message to the chat history
 * 
 * @param {string} text - Agent's response
 */
function addAgentMessage(text) {
  messages.value.push({
    role: 'agent',
    text,
  })
}

/**
 * Extracts answer text from agent response, handling various response formats
 * 
 * Step 1: Check primary answer field
 * Step 2: Fall back to alternative response field
 * Step 3: Ensure result is string, not object
 * 
 * @param {AgentResponse} data - Response from agent endpoint
 * @returns {string} Clean answer text
 */
function extractAnswerText(data) {
  const rawAnswer = data.answer || data.response || 'No response.'
  
  // Ensure we're returning a string, not an object
  if (typeof rawAnswer === 'string') {
    return rawAnswer
  }
  
  // Fallback: stringify objects for debugging
  return JSON.stringify(rawAnswer, null, 2)
}

// ============================================================================
// API COMMUNICATION
// ============================================================================

/**
 * Sends query to agent endpoint with automatic page context
 * 
 * Step 1: Get current page context (clientId, fileNumberId)
 * Step 2: Send POST request to /agent/query with context
 * Step 3: Extract answer from response
 * Step 4: Return agent's response text
 * 
 * @param {string} query - User's question
 * @returns {Promise<string>} Agent's response
 * @throws {Error} If API call fails
 */
async function queryAgent(query) {
  const context = pageContext.value
  
  console.log('[AgentSidebar] Sending query with context:', { query, context })
  
  const response = await api.post('/agent/query', {
    query,
    clientId: context.clientId,
    fileNumberId: context.fileNumberId,
  })
  
  console.log('[AgentSidebar] Received response:', response)
  
  return extractAnswerText(response)
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handles errors from agent query, displaying error state and adding error message
 * 
 * Step 1: Store error message and details
 * Step 2: Add error message to chat history for user visibility
 * 
 * @param {Error} err - The error that occurred
 */
function handleQueryError(err) {
  error.value = err.message
  errorDetails.value = err
  
  // Show error in chat so user sees feedback
  addAgentMessage(`Error: ${err.message}`)
}

/**
 * Clears current error state
 */
function clearError() {
  error.value = null
  errorDetails.value = null
}

// ============================================================================
// MAIN MESSAGE HANDLER
// ============================================================================

/**
 * Main handler for sending a message
 * 
 * Step 1: Validate input is not empty
 * Step 2: Prevent duplicate submissions while loading
 * Step 3: Display user message immediately
 * Step 4: Query agent with page context and display response
 * Step 5: Handle errors gracefully
 * 
 * Assumes: User is authenticated via API middleware
 */
async function sendMessage() {
  // Validate input
  if (!input.value.trim() || loading.value) {
    return
  }

  const userMessage = input.value

  // Display user message immediately
  addUserMessage(userMessage)
  input.value = ''

  // Begin loading state
  loading.value = true
  clearError()

  try {
    // Query agent (with automatic context)
    const agentResponse = await queryAgent(userMessage)
    
    // Display agent response
    addAgentMessage(agentResponse)
  } catch (err) {
    handleQueryError(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ========================================================================== */
/* TOGGLE BUTTON - Floating action button when sidebar closed                */
/* ========================================================================== */

.agent-chat-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #2d3a4a;
  color: #fff;
  border-radius: 24px;
  padding: 12px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 1000;
  border: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.agent-chat-toggle:hover {
  background: #1f2937;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* ========================================================================== */
/* SIDEBAR - Main chat container                                             */
/* ========================================================================== */

.agent-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  height: 100vh;
  background: #fff;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.12);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

/* ========================================================================== */
/* HEADER - Title bar with close button                                      */
/* ========================================================================== */

.agent-sidebar header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #2d3a4a;
  color: #fff;
  font-weight: 600;
  gap: 8px;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.header-title span:first-child {
  font-size: 16px;
  font-weight: 600;
}

.context-badge {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
  color: #cbd5e1;
}

.agent-sidebar header button {
  background: transparent;
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  white-space: nowrap;
}

.agent-sidebar header button:hover {
  opacity: 0.8;
}

/* ========================================================================== */
/* ERROR MESSAGE - Warning display                                           */
/* ========================================================================== */

.error-message {
  padding: 8px 12px;
  background: #fff3cd;
  color: #664d03;
  border-bottom: 1px solid #ffecb5;
  font-size: 12px;
  line-height: 1.4;
}

.error-code {
  margin-top: 4px;
  font-family: monospace;
  font-size: 11px;
  opacity: 0.8;
}

/* ========================================================================== */
/* CHAT HISTORY - Message display area                                       */
/* ========================================================================== */

.agent-chat-history {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-chat-history .user,
.agent-chat-history .agent {
  margin-bottom: 8px;
  line-height: 1.5;
}

.agent-chat-history .user {
  text-align: right;
}

.agent-chat-history .user strong {
  color: #2d3a4a;
  margin-right: 8px;
}

.agent-chat-history .user span {
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 8px;
  display: inline-block;
  max-width: 85%;
  word-wrap: break-word;
}

.agent-chat-history .agent strong {
  color: #2d3a4a;
  margin-right: 8px;
}

.agent-chat-history .agent span {
  background: #e8f4f8;
  padding: 8px 12px;
  border-radius: 8px;
  display: inline-block;
  max-width: 85%;
  word-wrap: break-word;
}

/* ========================================================================== */
/* INPUT FORM - Message composition area                                     */
/* ========================================================================== */

form {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #eee;
  background: #fff;
}

input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
  font-family: inherit;
}

input::placeholder {
  color: #999;
}

input:disabled {
  background: #f5f5f5;
  color: #999;
}

button[type='submit'] {
  background: #2d3a4a;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

button[type='submit']:hover:not(:disabled) {
  background: #1f2937;
}

button[type='submit']:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
