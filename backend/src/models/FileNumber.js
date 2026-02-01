const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');

const FILE_NUMBERS_TABLE = process.env.DYNAMODB_TABLE_FILE_NUMBERS || 'file-numbers';

class FileNumber {
  static async create(fileData) {
    const fileId = uuidv4();
    const item = {
      fileId,
      packageId: fileData.packageId || null,
      clientId: fileData.clientId || null,
      fileNumber: fileData.fileNumber,
      description: fileData.description || null,
      status: fileData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.put({
      TableName: FILE_NUMBERS_TABLE,
      Item: item,
    }).promise();

    return item;
  }

  static async getById(fileId) {
    const result = await dynamodb.get({
      TableName: FILE_NUMBERS_TABLE,
      Key: { fileId },
    }).promise();

    return result.Item || null;
  }

  static async getByClientId(clientId) {
    const result = await dynamodb.scan({
      TableName: FILE_NUMBERS_TABLE,
      FilterExpression: 'clientId = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
    }).promise();

    return result.Items || [];
  }

  static async getByPackageId(packageId) {
    const result = await dynamodb.query({
      TableName: FILE_NUMBERS_TABLE,
      IndexName: 'packageIdIndex',
      KeyConditionExpression: 'packageId = :packageId',
      ExpressionAttributeValues: {
        ':packageId': packageId,
      },
    }).promise();

    return result.Items || [];
  }

  static async update(fileId, updates) {
    const updateData = { ...updates, updatedAt: new Date().toISOString() };
    
    const updateExpression = Object.keys(updateData)
      .map(key => `${key} = :${key}`)
      .join(', ');
    
    const expressionAttributeValues = {};
    Object.keys(updateData).forEach(key => {
      expressionAttributeValues[`:${key}`] = updateData[key];
    });

    await dynamodb.update({
      TableName: FILE_NUMBERS_TABLE,
      Key: { fileId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    return await this.getById(fileId);
  }

  static async delete(fileId) {
    await dynamodb.delete({
      TableName: FILE_NUMBERS_TABLE,
      Key: { fileId },
    }).promise();
  }
}

module.exports = FileNumber;
