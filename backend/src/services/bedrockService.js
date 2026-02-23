/**
 * INTENT: Bedrock agent singleton client and stream-consuming invoke helper.
 * Shared by documentController (document analysis and chat) and agentController
 * (dashboard-level queries).
 */

const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;
const REGION = 'us-east-1';
const CHAT_MODEL_ID = 'amazon.nova-pro-v1:0';

let bedrockAgentClient = null;
let bedrockRuntimeClient = null;

function getClient() {
  if (!bedrockAgentClient) {
    bedrockAgentClient = new BedrockAgentRuntimeClient({ region: REGION });
  }
  return bedrockAgentClient;
}

function getRuntimeClient() {
  if (!bedrockRuntimeClient) {
    bedrockRuntimeClient = new BedrockRuntimeClient({ region: REGION });
  }
  return bedrockRuntimeClient;
}

/**
 * INTENT: Returns true when the Bedrock agent env vars are configured.
 */
function isAgentConfigured() {
  return !!(AGENT_ID && AGENT_ALIAS_ID);
}

/**
 * INTENT: Invoke the Bedrock agent and return the full response as a string.
 * Consumes the async completion stream and joins all text chunks.
 * Input: query string, sessionId string
 * Output: assistant response string
 */
async function invokeAgent(query, sessionId) {
  const client = getClient();
  const command = new InvokeAgentCommand({
    agentId: AGENT_ID,
    agentAliasId: AGENT_ALIAS_ID,
    sessionId,
    inputText: query,
  });

  const response = await client.send(command);

  const chunks = [];
  if (response.completion) {
    for await (const event of response.completion) {
      if (event.chunk?.bytes) {
        chunks.push(Buffer.from(event.chunk.bytes).toString('utf-8'));
      }
    }
  }

  return chunks.join('');
}

/**
 * INTENT: Invoke a Bedrock model directly (bypassing the agent) with an explicit
 * system prompt and a single user message. Used where strict output format control
 * is needed (e.g. JSON responses) that the agent's own instructions would override.
 * Input: systemPrompt string, userMessage string
 * Output: model response text string
 */
async function invokeModel(systemPrompt, userMessage) {
  const client = getRuntimeClient();
  const command = new ConverseCommand({
    modelId: CHAT_MODEL_ID,
    system: [{ text: systemPrompt }],
    messages: [{ role: 'user', content: [{ text: userMessage }] }],
    inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
  });

  const response = await client.send(command);
  return response.output?.message?.content?.[0]?.text ?? '';
}

module.exports = { isAgentConfigured, invokeAgent, invokeModel };
