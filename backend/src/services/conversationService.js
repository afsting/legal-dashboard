/**
 * INTENT: Load and save document conversation history.
 * History is stored as gzipped JSON in S3. Legacy documents with conversation
 * history in DynamoDB are migrated to S3 transparently on first access.
 */

const Document = require('../models/Document');
const {
  EXTRACTED_TEXT_BUCKET,
  resolveConversationHistoryS3Key,
  putTextToS3,
  getTextFromS3,
} = require('./s3Storage');

/**
 * INTENT: Load conversation history from S3, migrating from DynamoDB if needed.
 * Input: fileId, documentId, document record
 * Output: array of { role, content, timestamp } messages
 */
async function loadConversationHistory(fileId, documentId, document) {
  // 1) Already stored in S3
  if (document.conversationHistoryS3Key) {
    const json = await getTextFromS3(EXTRACTED_TEXT_BUCKET, document.conversationHistoryS3Key);
    return JSON.parse(json);
  }

  // 2) Legacy: history stored in DynamoDB array — migrate to S3
  if (Array.isArray(document.conversationHistory) && document.conversationHistory.length > 0) {
    const s3Key = resolveConversationHistoryS3Key(fileId, documentId, document);
    await putTextToS3(EXTRACTED_TEXT_BUCKET, s3Key, JSON.stringify(document.conversationHistory));
    await Document.update(fileId, documentId, {
      conversationHistoryS3Key: s3Key,
      conversationHistoryUpdatedAt: new Date().toISOString(),
      conversationHistory: null,
    });
    return document.conversationHistory;
  }

  // 3) No history yet
  return [];
}

/**
 * INTENT: Persist conversation history to S3 and update the DynamoDB S3 key reference.
 * Input: fileId, documentId, document record, history array
 * Output: s3Key string
 */
async function saveConversationHistory(fileId, documentId, document, history) {
  const s3Key = document.conversationHistoryS3Key
    || resolveConversationHistoryS3Key(fileId, documentId, document);
  await putTextToS3(EXTRACTED_TEXT_BUCKET, s3Key, JSON.stringify(history));
  await Document.update(fileId, documentId, {
    conversationHistoryS3Key: s3Key,
    conversationHistoryUpdatedAt: new Date().toISOString(),
    conversationHistory: null,
  });
  return s3Key;
}

module.exports = { loadConversationHistory, saveConversationHistory };
