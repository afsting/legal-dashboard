/**
 * INTENT: Async Bedrock Agent Worker Lambda
 *
 * Purpose: Invoked asynchronously (InvocationType: Event) by the main API
 * handler to run long-running Bedrock agent calls without being constrained
 * by API Gateway's 29-second integration timeout.
 *
 * Input event: { jobId, query, clientId?, fileNumberId? }
 * Output: none (writes result directly to the agent-jobs DynamoDB table)
 *
 * Flow:
 *   1. Mark job as 'running'
 *   2. Fetch actual file number string from DynamoDB (if fileNumberId given)
 *   3. Build full query with context
 *   4. Invoke Bedrock agent
 *   5. Write result → 'complete', or error → 'failed'
 */

const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// ============================================================================
// CONFIG
// ============================================================================

const REGION = process.env.AWS_REGION || 'us-east-1';
const AGENT_ID = process.env.BEDROCK_SUPERVISOR_AGENT_ID || process.env.BEDROCK_AGENT_ID;
const AGENT_ALIAS_ID = process.env.BEDROCK_SUPERVISOR_AGENT_ALIAS_ID || process.env.BEDROCK_AGENT_ALIAS_ID;
const JOBS_TABLE = process.env.DYNAMODB_TABLE_AGENT_JOBS || 'agent-jobs';
const FILE_NUMBERS_TABLE = process.env.DYNAMODB_TABLE_FILE_NUMBERS || 'file-numbers';

// ============================================================================
// AWS CLIENTS
// ============================================================================

const isLocalStack = process.env.NODE_ENV === 'development';
const baseConfig = isLocalStack
  ? {
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    }
  : { region: REGION };

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient(baseConfig));
const bedrockClient = new BedrockAgentRuntimeClient({ region: REGION });

// ============================================================================
// HELPERS
// ============================================================================

async function markRunning(jobId) {
  await dynamodb.send(new UpdateCommand({
    TableName: JOBS_TABLE,
    Key: { jobId },
    UpdateExpression: 'SET #s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'running' },
  }));
}

async function markComplete(jobId, result) {
  await dynamodb.send(new UpdateCommand({
    TableName: JOBS_TABLE,
    Key: { jobId },
    UpdateExpression: 'SET #s = :s, #r = :r, completedAt = :t',
    ExpressionAttributeNames: { '#s': 'status', '#r': 'result' },
    ExpressionAttributeValues: {
      ':s': 'complete',
      ':r': result,
      ':t': new Date().toISOString(),
    },
  }));
}

async function markFailed(jobId, errorMessage) {
  await dynamodb.send(new UpdateCommand({
    TableName: JOBS_TABLE,
    Key: { jobId },
    UpdateExpression: 'SET #s = :s, #e = :e, completedAt = :t',
    ExpressionAttributeNames: { '#s': 'status', '#e': 'error' },
    ExpressionAttributeValues: {
      ':s': 'failed',
      ':e': errorMessage,
      ':t': new Date().toISOString(),
    },
  }));
}

async function fetchFileNumber(fileNumberId) {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: FILE_NUMBERS_TABLE,
      Key: { fileId: fileNumberId },
    }));
    return result.Item?.fileNumber || null;
  } catch (err) {
    console.error('[AgentWorker] Failed to fetch file number:', err.message);
    return null;
  }
}

function buildQueryWithContext(query, clientId, fileNumberId, fileNumber) {
  const parts = [];
  if (clientId) parts.push(`Client ID: ${clientId}`);
  if (fileNumberId) {
    parts.push(`File ID: ${fileNumberId}`);
    if (fileNumber) parts.push(`File Number: ${fileNumber}`);
  }
  if (parts.length === 0) return query;
  return `Context: ${parts.join(', ')}\n\nQuery: ${query}`;
}

async function consumeStream(stream) {
  if (!stream || !stream[Symbol.asyncIterator]) return '';
  const chunks = [];
  try {
    for await (const event of stream) {
      if (event.chunk?.bytes) {
        chunks.push(Buffer.from(event.chunk.bytes).toString('utf-8'));
      } else if (event.contentBlockDelta?.delta?.text) {
        chunks.push(event.contentBlockDelta.delta.text);
      }
    }
  } catch (err) {
    console.error('[AgentWorker] Stream error:', err.message);
  }
  return chunks.join('');
}

function parseResponse(text) {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    return parsed.output || parsed.response || parsed.message || parsed.content || JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}

// ============================================================================
// HANDLER
// ============================================================================

exports.handler = async (event) => {
  const { jobId, query, clientId, fileNumberId } = event;

  console.log('[AgentWorker] Starting job:', jobId);

  if (!jobId || !query) {
    console.error('[AgentWorker] Missing jobId or query in event');
    return;
  }

  try {
    await markRunning(jobId);

    // Resolve file number string for context
    const fileNumber = fileNumberId ? await fetchFileNumber(fileNumberId) : null;
    const fullQuery = buildQueryWithContext(query, clientId, fileNumberId, fileNumber);

    console.log('[AgentWorker] Invoking Bedrock agent, query length:', fullQuery.length);

    if (!AGENT_ID || !AGENT_ALIAS_ID) {
      throw new Error('Bedrock agent configuration missing (BEDROCK_SUPERVISOR_AGENT_ID or BEDROCK_AGENT_ID)');
    }

    const command = new InvokeAgentCommand({
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: `job-${jobId}`,
      inputText: fullQuery,
    });

    const response = await bedrockClient.send(command);

    if (!response.completion) {
      throw new Error('No completion stream in agent response');
    }

    const streamText = await consumeStream(response.completion);
    const answer = parseResponse(streamText);

    console.log('[AgentWorker] Job complete, answer length:', answer.length);
    await markComplete(jobId, answer);
  } catch (err) {
    console.error('[AgentWorker] Job failed:', err.message);
    await markFailed(jobId, err.message);
  }
};
