/**
 * INTENT: AgentJob DynamoDB model
 *
 * Purpose: Persist async Bedrock agent job state so the frontend can poll
 * for results after the API Gateway 29-second limit has passed.
 *
 * Schema:
 *   jobId      (PK, string)  — UUID generated at request time
 *   status     (string)      — 'pending' | 'running' | 'complete' | 'failed'
 *   result     (string)      — agent answer, present when status = 'complete'
 *   error      (string)      — error message, present when status = 'failed'
 *   query      (string)      — original user query (for worker use)
 *   clientId   (string)      — optional context
 *   fileNumberId (string)    — optional context
 *   createdAt  (string)      — ISO timestamp
 *   expiresAt  (number)      — Unix epoch seconds; TTL attribute (24 h)
 */

const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');
const { PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.DYNAMODB_TABLE_AGENT_JOBS || 'agent-jobs';
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

class AgentJob {
  /**
   * Create a new job in 'pending' status and return the full item.
   *
   * @param {{ query: string, clientId?: string, fileNumberId?: string }} params
   * @returns {Promise<{ jobId: string, status: string, createdAt: string }>}
   */
  static async create({ query, clientId, fileNumberId }) {
    const jobId = uuidv4();
    const now = new Date();
    const item = {
      jobId,
      status: 'pending',
      query,
      createdAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + TTL_SECONDS,
    };
    if (clientId) item.clientId = clientId;
    if (fileNumberId) item.fileNumberId = fileNumberId;

    await dynamodb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return item;
  }

  /**
   * Fetch a job by ID. Returns null if not found.
   *
   * @param {string} jobId
   * @returns {Promise<Object|null>}
   */
  static async getById(jobId) {
    const result = await dynamodb.send(new GetCommand({
      TableName: TABLE,
      Key: { jobId },
    }));
    return result.Item || null;
  }

  /**
   * Transition job to 'running'.
   *
   * @param {string} jobId
   */
  static async markRunning(jobId) {
    await dynamodb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { jobId },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'running' },
    }));
  }

  /**
   * Mark job complete with the agent's answer.
   *
   * @param {string} jobId
   * @param {string} result
   */
  static async markComplete(jobId, result) {
    await dynamodb.send(new UpdateCommand({
      TableName: TABLE,
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

  /**
   * Mark job failed with an error message.
   *
   * @param {string} jobId
   * @param {string} errorMessage
   */
  static async markFailed(jobId, errorMessage) {
    await dynamodb.send(new UpdateCommand({
      TableName: TABLE,
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
}

module.exports = AgentJob;
