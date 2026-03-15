/**
 * INTENT: Bedrock Agent Invocation Controller — Async Job Pattern
 *
 * Purpose: Handle legal document analysis queries by dispatching jobs to an
 * async worker Lambda. Returns a jobId immediately so the browser never hits
 * the API Gateway 29-second integration timeout, even for long demand letters.
 *
 * Endpoints:
 *   POST /api/agent/query      → create job, fire worker async, return jobId
 *   GET  /api/agent/jobs/:id   → return job status / result
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const AgentJob = require('../models/AgentJob');

// ============================================================================
// CONFIG
// ============================================================================

const REGION = process.env.AWS_REGION || 'us-east-1';
const WORKER_FUNCTION_NAME = process.env.AGENT_WORKER_FUNCTION_NAME;

// Re-check agent config (needed for the 400 validation guard)
const AGENT_ID = process.env.BEDROCK_SUPERVISOR_AGENT_ID || process.env.BEDROCK_AGENT_ID;
const AGENT_ALIAS_ID = process.env.BEDROCK_SUPERVISOR_AGENT_ALIAS_ID || process.env.BEDROCK_AGENT_ALIAS_ID;

// ============================================================================
// LAMBDA CLIENT
// ============================================================================

let lambdaClient = null;

function getLambdaClient() {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({ region: REGION });
  }
  return lambdaClient;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fires the worker Lambda asynchronously (InvocationType: Event).
 * Returns immediately; worker writes result back to DynamoDB.
 *
 * @param {{ jobId: string, query: string, clientId?: string, fileNumberId?: string }} payload
 */
async function dispatchWorker(payload) {
  if (!WORKER_FUNCTION_NAME) {
    throw new Error('AGENT_WORKER_FUNCTION_NAME env var not set');
  }

  const command = new InvokeCommand({
    FunctionName: WORKER_FUNCTION_NAME,
    InvocationType: 'Event', // async — do not wait for response
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  await getLambdaClient().send(command);
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /api/agent/query
 *
 * Creates a job and dispatches the worker Lambda asynchronously.
 * Returns { jobId, status: 'pending' } immediately.
 */
exports.invokeAgent = async (req, res) => {
  try {
    const { query, clientId, fileNumberId } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required and cannot be empty' });
    }

    if (!AGENT_ID || !AGENT_ALIAS_ID) {
      return res.status(400).json({ error: 'Bedrock agent configuration missing (BEDROCK_SUPERVISOR_AGENT_ID or BEDROCK_AGENT_ID)' });
    }

    // Create job record in DynamoDB
    const job = await AgentJob.create({ query, clientId, fileNumberId });

    // Dispatch worker Lambda asynchronously (fire and forget)
    await dispatchWorker({
      jobId: job.jobId,
      query,
      ...(clientId && { clientId }),
      ...(fileNumberId && { fileNumberId }),
    });

    console.log('[AgentController] Job dispatched:', job.jobId);
    res.status(202).json({ jobId: job.jobId, status: 'pending' });
  } catch (err) {
    console.error('[AgentController] Dispatch error:', err.message);
    res.status(500).json({ error: 'Failed to start query', details: err.message });
  }
};

/**
 * GET /api/agent/jobs/:jobId
 *
 * Returns the current job status and, when complete, the agent's answer.
 * Response shape:
 *   { jobId, status: 'pending'|'running'|'complete'|'failed', answer?, error? }
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const job = await AgentJob.getById(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const response = { jobId: job.jobId, status: job.status };

    if (job.status === 'complete') {
      response.answer = job.result;
    } else if (job.status === 'failed') {
      response.error = job.error;
    }

    res.json(response);
  } catch (err) {
    console.error('[AgentController] Status check error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve job status', details: err.message });
  }
};
