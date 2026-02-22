const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');
const { PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const DOCUMENTS_TABLE = process.env.DYNAMODB_TABLE_DOCUMENTS || 'documents';

class Document {
  static async create(fileId, documentData) {
    const documentId = uuidv4();
    const item = {
      fileId,
      documentId,
      clientId: documentData.clientId,
      fileNumber: documentData.fileNumber,
      fileName: documentData.fileName,
      contentType: documentData.contentType,
      size: documentData.size,
      s3Key: documentData.s3Key,
      latestVersionId: documentData.latestVersionId || null,
      uploadedBy: documentData.uploadedBy,
      extractedText: null,            // Legacy: raw extracted text (no longer stored in DynamoDB)
      extractedTextS3Key: null,       // S3 key where extracted text is stored
      extractedTextS3UpdatedAt: null, // ISO timestamp when extracted text was last saved to S3
      analysis: null,                 // Short preview of AI analysis (~500 chars) for list display
      analysisS3Key: null,            // S3 key where full AI analysis is stored
      analysisS3UpdatedAt: null,      // ISO timestamp when analysis was last saved to S3
      analyzedAt: null,
      conversationHistoryS3Key: null,       // S3 key where conversation history is stored
      conversationHistoryUpdatedAt: null,   // ISO timestamp when history was last saved to S3
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedBy: null,
    };

    await dynamodb.send(new PutCommand({
      TableName: DOCUMENTS_TABLE,
      Item: item,
    }));

    return item;
  }

  static async listByFileId(fileId) {
    const result = await dynamodb.send(new QueryCommand({
      TableName: DOCUMENTS_TABLE,
      KeyConditionExpression: 'fileId = :fileId',
      ExpressionAttributeValues: {
        ':fileId': fileId,
      },
    }));

    return (result.Items || []).filter(item => !item.deletedAt);
  }

  static async getById(fileId, documentId) {
    const result = await dynamodb.send(new GetCommand({
      TableName: DOCUMENTS_TABLE,
      Key: { fileId, documentId },
    }));

    return result.Item || null;
  }

  static async findByFileName(fileId, fileName) {
    const items = await this.listByFileId(fileId);
    return items.find(item => item.fileName === fileName) || null;
  }

  static async update(fileId, documentId, updates) {
    const updateData = { ...updates, updatedAt: new Date().toISOString() };

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updateExpression = Object.keys(updateData)
      .map(key => `${key} = :${key}`)
      .join(', ');

    const expressionAttributeValues = {};
    Object.keys(updateData).forEach(key => {
      expressionAttributeValues[`:${key}`] = updateData[key];
    });

    await dynamodb.send(new UpdateCommand({
      TableName: DOCUMENTS_TABLE,
      Key: { fileId, documentId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    return await this.getById(fileId, documentId);
  }

  static async softDelete(fileId, documentId, deletedBy) {
    return await this.update(fileId, documentId, {
      deletedAt: new Date().toISOString(),
      deletedBy,
    });
  }
}

module.exports = Document;
