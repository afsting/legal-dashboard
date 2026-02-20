const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedBy: null,
    };

    await dynamodb.put({
      TableName: DOCUMENTS_TABLE,
      Item: item,
    }).promise();

    return item;
  }

  static async listByFileId(fileId) {
    const result = await dynamodb.query({
      TableName: DOCUMENTS_TABLE,
      KeyConditionExpression: 'fileId = :fileId',
      ExpressionAttributeValues: {
        ':fileId': fileId,
      },
    }).promise();

    return (result.Items || []).filter(item => !item.deletedAt);
  }

  static async getById(fileId, documentId) {
    const result = await dynamodb.get({
      TableName: DOCUMENTS_TABLE,
      Key: { fileId, documentId },
    }).promise();

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

    await dynamodb.update({
      TableName: DOCUMENTS_TABLE,
      Key: { fileId, documentId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

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
