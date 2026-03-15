/**
 * INTENT: Bedrock Action Group Lambda for the Demand Narrative Sub-Agent.
 * Gives the agent two operations to fetch document data for a specific file number:
 *   - listDocuments(fileId)         → document list with metadata
 *   - getDocumentText(fileId, documentId) → full extracted text from S3
 *
 * Event format (Bedrock OpenAPI action group):
 *   { apiPath, httpMethod, actionGroup, parameters: [{name, type, value}] }
 *
 * Response format:
 *   { messageVersion, response: { actionGroup, apiPath, httpMethod, httpStatusCode, responseBody } }
 */

const zlib = require('zlib');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION || 'us-east-1';
const DOCUMENTS_TABLE = process.env.DYNAMODB_TABLE_DOCUMENTS || 'documents';
const EXTRACTED_TEXT_BUCKET = process.env.S3_BUCKET_EXTRACTED_TEXT;

const dynamodbClient = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const s3 = new S3Client({ region: REGION });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * INTENT: Extract named parameter value from Bedrock action group event.
 * Input: parameters array from event, parameter name
 * Output: string value or null
 */
function getParam(parameters, name) {
  const param = (parameters || []).find(p => p.name === name);
  return param ? param.value : null;
}

/**
 * INTENT: Build a Bedrock action group response envelope.
 * Input: apiPath, httpMethod, actionGroup, statusCode, body string
 * Output: Bedrock-formatted response object
 */
function buildResponse(apiPath, httpMethod, actionGroup, statusCode, body) {
  return {
    messageVersion: '1.0',
    response: {
      actionGroup,
      apiPath,
      httpMethod,
      httpStatusCode: statusCode,
      responseBody: {
        'application/json': {
          body: typeof body === 'string' ? body : JSON.stringify(body),
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * INTENT: List all non-deleted documents for a given file number (by fileId).
 * Input:  fileId — DynamoDB partition key for the documents table (UUID)
 * Output: JSON array of { documentId, fileName, contentType, extractedTextS3Key }
 */
async function listDocuments(fileId) {
  if (!fileId) {
    return { error: 'fileId is required' };
  }

  const result = await dynamodb.send(new QueryCommand({
    TableName: DOCUMENTS_TABLE,
    KeyConditionExpression: 'fileId = :fileId',
    ExpressionAttributeValues: { ':fileId': fileId },
  }));

  const documents = (result.Items || [])
    .filter(item => !item.deletedAt)
    .map(item => ({
      documentId: item.documentId,
      fileName: item.fileName,
      contentType: item.contentType,
      extractedTextS3Key: item.extractedTextS3Key || null,
    }));

  return { documents };
}

/**
 * INTENT: Fetch and decompress extracted document text from S3.
 * Input:  fileId, documentId — used to look up document metadata in DynamoDB
 * Output: { documentId, fileName, text } or { error }
 */
async function getDocumentText(fileId, documentId) {
  if (!fileId || !documentId) {
    return { error: 'fileId and documentId are required' };
  }

  const result = await dynamodb.send(new GetCommand({
    TableName: DOCUMENTS_TABLE,
    Key: { fileId, documentId },
  }));

  const document = result.Item;
  if (!document || document.deletedAt) {
    return { error: `Document ${documentId} not found` };
  }

  if (!document.extractedTextS3Key) {
    return { error: `No extracted text available for document ${documentId} (${document.fileName})` };
  }

  if (!EXTRACTED_TEXT_BUCKET) {
    return { error: 'S3_BUCKET_EXTRACTED_TEXT is not configured' };
  }

  const s3Response = await s3.send(new GetObjectCommand({
    Bucket: EXTRACTED_TEXT_BUCKET,
    Key: document.extractedTextS3Key,
  }));

  const bodyBuffer = Buffer.from(await s3Response.Body.transformToByteArray());
  const isGzipped = s3Response.ContentEncoding === 'gzip' || document.extractedTextS3Key.endsWith('.gz');
  const text = isGzipped
    ? zlib.gunzipSync(bodyBuffer).toString('utf-8')
    : bodyBuffer.toString('utf-8');

  return {
    documentId: document.documentId,
    fileName: document.fileName,
    text,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

exports.handler = async (event) => {
  console.log('[DemandFetcher] Event:', JSON.stringify(event, null, 2));

  const { apiPath, httpMethod, actionGroup, parameters } = event;

  try {
    if (apiPath === '/list-documents') {
      const fileId = getParam(parameters, 'fileId');
      const result = await listDocuments(fileId);
      const statusCode = result.error ? 400 : 200;
      return buildResponse(apiPath, httpMethod, actionGroup, statusCode, JSON.stringify(result));
    }

    if (apiPath === '/get-document-text') {
      const fileId = getParam(parameters, 'fileId');
      const documentId = getParam(parameters, 'documentId');
      const result = await getDocumentText(fileId, documentId);
      const statusCode = result.error ? 400 : 200;
      return buildResponse(apiPath, httpMethod, actionGroup, statusCode, JSON.stringify(result));
    }

    return buildResponse(apiPath, httpMethod, actionGroup, 404, JSON.stringify({ error: `Unknown operation: ${apiPath}` }));
  } catch (error) {
    console.error('[DemandFetcher] Error:', error.message);
    return buildResponse(apiPath, httpMethod, actionGroup, 500, JSON.stringify({ error: error.message }));
  }
};
