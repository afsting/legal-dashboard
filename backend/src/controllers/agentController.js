/**
 * INTENT: Bedrock Agent Invocation Controller
 * 
 * Purpose: Handle legal document analysis queries by invoking AWS Bedrock agents
 * with knowledge base context. Manages request validation, agent communication,
 * response streaming, and error handling.
 * 
 * Input: HTTP POST request with query text and optional case context
 * Output: Agent response synthesized from knowledge base documents
 */

const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const FileNumber = require('../models/FileNumber');

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * @typedef {Object} AgentRequest
 * @property {string} query - The user's question
 * @property {string} [clientId] - Optional client identifier for context
 * @property {string} [fileNumberId] - Optional file number identifier for context
 */

/**
 * @typedef {Object} AgentResponse
 * @property {string} answer - The agent's synthesized response
 * @property {string} query - Echo of the input query
 * @property {string} [clientId] - Client context if provided
 * @property {string} [fileNumber] - File number context if provided
 */

const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;
const REGION = 'us-east-1';

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

let bedrockAgentClient = null;

function initializeClient() {
  try {
    if (!bedrockAgentClient) {
      bedrockAgentClient = new BedrockAgentRuntimeClient({ region: REGION });
    }
    return bedrockAgentClient;
  } catch (error) {
    console.error('Failed to initialize Bedrock client:', error.message);
    return null;
  }
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validates that the request contains required fields
 * @param {AgentRequest} body - The request body
 * @returns {Array} Array of error messages, empty if valid
 */
function validateRequest(body) {
  const errors = [];

  if (!body.query || !body.query.trim()) {
    errors.push('Query is required and cannot be empty');
  }

  if (!AGENT_ID || !AGENT_ALIAS_ID) {
    errors.push('Bedrock agent configuration missing (BEDROCK_AGENT_ID or BEDROCK_AGENT_ALIAS_ID)');
  }

  return errors;
}

// ============================================================================
// QUERY BUILDING
// ============================================================================

/**
 * Builds the full query with optional case context
 * Step 1: Extract context parameters
 * Step 2: Fetch actual file number string from database if ID provided
 * Step 3: Format context string with human-readable values
 * Step 4: Combine context with user query
 * 
 * @param {string} query - User's question
 * @param {string} [clientId] - Optional client ID
 * @param {string} [fileNumberId] - Optional file number ID (UUID)
 * @returns {Promise<string>} Complete query with context
 */
async function buildQueryWithContext(query, clientId, fileNumberId) {
  const hasContext = clientId || fileNumberId;
  if (!hasContext) {
    return query;
  }

  const contextParts = [];
  
  // Add client context
  if (clientId) {
    contextParts.push(`Client ID: ${clientId}`);
  }
  
  // Fetch and add actual file number string
  if (fileNumberId) {
    try {
      const fileNumberRecord = await FileNumber.getById(fileNumberId);
      if (fileNumberRecord && fileNumberRecord.fileNumber) {
        contextParts.push(`File Number: ${fileNumberRecord.fileNumber}`);
      } else {
        // Fallback to UUID if lookup fails
        contextParts.push(`File Number ID: ${fileNumberId}`);
      }
    } catch (error) {
      console.error('Failed to fetch file number:', error.message);
      // Fallback to UUID if lookup fails
      contextParts.push(`File Number ID: ${fileNumberId}`);
    }
  }

  const context = `Context: ${contextParts.join(', ')}`;
  return `${context}\n\nQuery: ${query}`;
}

// ============================================================================
// STREAM PARSING
// ============================================================================

/**
 * Converts AWS SDK v3 async iterable stream to text
 * Handles multiple event types emitted by Bedrock Agent Runtime
 * 
 * Step 1: Validate stream exists
 * Step 2: Check if stream is async iterable
 * Step 3: Consume events and extract text chunks
 * Step 4: Aggregate chunks into complete response
 * 
 * @param {AsyncIterable} stream - The response stream from agent
 * @returns {Promise<string>} Complete response text
 */
async function consumeStream(stream) {
  if (!stream) {
    return '';
  }

  // Check if stream is async iterable
  if (!stream[Symbol.asyncIterator]) {
    console.warn('Stream is not async iterable');
    return '';
  }

  const chunks = [];
  
  try {
    for await (const event of stream) {
      // Extract text from various event shapes
      const text = extractTextFromEvent(event);
      if (text) {
        chunks.push(text);
      }
    }
  } catch (error) {
    console.error('Error consuming stream:', error.message);
  }

  return chunks.join('');
}

/**
 * Extracts text content from a single stream event
 * Handles: chunk.bytes (SDK format), contentBlockDelta.delta.text (Claude format)
 * 
 * @param {Object} event - Single event from stream
 * @returns {string|null} Extracted text or null
 */
function extractTextFromEvent(event) {
  if (!event) {
    return null;
  }

  // Handle Bedrock chunk format with bytes
  if (event.chunk?.bytes) {
    try {
      return Buffer.from(event.chunk.bytes).toString('utf-8');
    } catch (error) {
      console.error('Failed to decode chunk bytes:', error.message);
      return null;
    }
  }

  // Handle Claude content block delta format
  if (event.contentBlockDelta?.delta?.text) {
    return event.contentBlockDelta.delta.text;
  }

  return null;
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

/**
 * Parses agent response, extracting text from various JSON structures
 * Handles cases where response is already text or wrapped in JSON
 * 
 * Step 1: Attempt JSON parse
 * Step 2: Search for text in known fields (output, response, message, content)
 * Step 3: Return text or fallback to stringified response
 * 
 * @param {string} responseText - Raw response from agent
 * @returns {string} Clean response text
 */
function parseResponse(responseText) {
  if (!responseText) {
    return '';
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(responseText);

    // Check common response field names
    if (typeof parsed.output === 'string') {
      return parsed.output;
    }
    if (parsed.response && typeof parsed.response === 'string') {
      return parsed.response;
    }
    if (parsed.message && typeof parsed.message === 'string') {
      return parsed.message;
    }
    if (parsed.content && typeof parsed.content === 'string') {
      return parsed.content;
    }

    // If no recognized field, return formatted JSON
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // Not JSON, return as-is
    return responseText;
  }
}

// ============================================================================
// BEDROCK INVOCATION
// ============================================================================

/**
 * Invokes the Bedrock agent and retrieves the response
 * 
 * Step 1: Ensure client is initialized
 * Step 2: Build invoke command with query and context
 * Step 3: Send command to Bedrock
 * Step 4: Consume response stream
 * Step 5: Parse and return response
 * 
 * @param {string} fullQuery - Complete query with context
 * @returns {Promise<string>} Agent's response text
 * @throws {Error} If invocation fails
 */
async function invokeBedrockAgent(fullQuery) {
  const client = initializeClient();
  if (!client) {
    throw new Error('Bedrock client unavailable');
  }

  const command = new InvokeAgentCommand({
    agentId: AGENT_ID,
    agentAliasId: AGENT_ALIAS_ID,
    sessionId: `session-${Date.now()}`,
    inputText: fullQuery,
  });

  const response = await client.send(command);

  // Response should have a completion stream
  if (!response.completion) {
    throw new Error('No completion stream in agent response');
  }

  const streamText = await consumeStream(response.completion);
  return parseResponse(streamText);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * HTTP handler for agent query endpoint
 * 
 * Step 1: Validate request format
 * Step 2: Build query with optional context
 * Step 3: Invoke Bedrock agent
 * Step 4: Return synthesized response
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.invokeAgent = async (req, res) => {
  try {
    // Step 1: Validate
    const errors = validateRequest(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const { query, clientId, fileNumberId } = req.body;

    // Step 2: Build query (now async, fetches actual file number)
    const fullQuery = await buildQueryWithContext(query, clientId, fileNumberId);

    // Step 3: Invoke agent
    const answer = await invokeBedrockAgent(fullQuery);

    // Step 4: Return response
    const response = {
      answer,
      query,
      ...(clientId && { clientId }),
      ...(fileNumberId && { fileNumberId }),
    };

    res.json(response);
  } catch (error) {
    console.error('Agent invocation error:', error.message);
    res.status(500).json({
      error: 'Failed to process query',
      details: error.message,
    });
  }
};
