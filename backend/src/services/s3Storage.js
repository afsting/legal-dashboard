/**
 * INTENT: S3 key building and gzip text put/get utilities.
 * All derived content (extracted text, analysis, chat history) uses the same
 * key convention: clients/{clientId}/file-numbers/{fileNumber}/{type}/{documentId}.ext.gz
 */

const zlib = require('zlib');
const { s3 } = require('../config/aws');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const EXTRACTED_TEXT_BUCKET = process.env.S3_BUCKET_EXTRACTED_TEXT || null;

// ---------------------------------------------------------------------------
// S3 key builders
// ---------------------------------------------------------------------------

function buildExtractedTextS3Key(clientId, fileNumber, documentId) {
  return `clients/${clientId}/file-numbers/${fileNumber}/extracted-text/${documentId}.txt.gz`;
}

function buildAnalysisS3Key(clientId, fileNumber, documentId) {
  return `clients/${clientId}/file-numbers/${fileNumber}/analysis/${documentId}.txt.gz`;
}

function buildConversationHistoryS3Key(clientId, fileNumber, documentId) {
  return `clients/${clientId}/file-numbers/${fileNumber}/chat/${documentId}.json.gz`;
}

// ---------------------------------------------------------------------------
// S3 key resolvers — use full path when clientId/fileNumber are available,
// fall back to fileId-based path for legacy documents.
// ---------------------------------------------------------------------------

function resolveExtractedTextS3Key(fileId, documentId, document) {
  if (document.clientId && document.fileNumber) {
    return buildExtractedTextS3Key(document.clientId, document.fileNumber, documentId);
  }
  console.warn(`Document ${documentId} missing clientId/fileNumber — using fileId-based S3 key`);
  return `extracted-text/${fileId}/${documentId}.txt.gz`;
}

function resolveAnalysisS3Key(fileId, documentId, document) {
  if (document.clientId && document.fileNumber) {
    return buildAnalysisS3Key(document.clientId, document.fileNumber, documentId);
  }
  console.warn(`Document ${documentId} missing clientId/fileNumber — using fileId-based S3 key`);
  return `analysis/${fileId}/${documentId}.txt.gz`;
}

function resolveConversationHistoryS3Key(fileId, documentId, document) {
  if (document.clientId && document.fileNumber) {
    return buildConversationHistoryS3Key(document.clientId, document.fileNumber, documentId);
  }
  console.warn(`Document ${documentId} missing clientId/fileNumber — using fileId-based S3 key`);
  return `chat/${fileId}/${documentId}.json.gz`;
}

// ---------------------------------------------------------------------------
// S3 put/get (gzipped)
// ---------------------------------------------------------------------------

/**
 * INTENT: Store text content to S3 (gzipped).
 * Input: bucket, key, text string
 * Output: { key, bytes }
 */
async function putTextToS3(bucket, key, text) {
  if (!bucket) {
    throw new Error('Extracted text bucket is not configured (S3_BUCKET_EXTRACTED_TEXT)');
  }

  const gzippedBody = zlib.gzipSync(Buffer.from(text || '', 'utf-8'));

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: gzippedBody,
    ContentType: 'text/plain; charset=utf-8',
    ContentEncoding: 'gzip',
  }));

  return { key, bytes: gzippedBody.length };
}

/**
 * INTENT: Load text content from S3 (supports gzipped content).
 * Input: bucket, key
 * Output: text string
 */
async function getTextFromS3(bucket, key) {
  if (!bucket) {
    throw new Error('Extracted text bucket is not configured (S3_BUCKET_EXTRACTED_TEXT)');
  }
  if (!key) {
    throw new Error('Missing S3 key');
  }

  const s3Response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bodyBuffer = Buffer.from(await s3Response.Body.transformToByteArray());

  const isGzipped = s3Response.ContentEncoding === 'gzip' || key.endsWith('.gz');
  return isGzipped
    ? zlib.gunzipSync(bodyBuffer).toString('utf-8')
    : bodyBuffer.toString('utf-8');
}

module.exports = {
  EXTRACTED_TEXT_BUCKET,
  buildExtractedTextS3Key,
  buildAnalysisS3Key,
  buildConversationHistoryS3Key,
  resolveExtractedTextS3Key,
  resolveAnalysisS3Key,
  resolveConversationHistoryS3Key,
  putTextToS3,
  getTextFromS3,
};
