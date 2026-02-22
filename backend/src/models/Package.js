const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');
const { PutCommand, GetCommand, ScanCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const PACKAGES_TABLE = process.env.DYNAMODB_TABLE_PACKAGES || 'packages';

class Package {
  static async create(clientId, packageData) {
    const packageId = uuidv4();
    const item = {
      packageId,
      clientId,
      fileNumberId: packageData.fileNumberId || null,
      name: packageData.name,
      description: packageData.description || null,
      recipient: packageData.recipient || null,
      type: packageData.type || 'general',
      status: packageData.status || 'draft',
      documents: packageData.documents || {
        medicalRecords: [],
        accidentReports: [],
        photographs: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.send(new PutCommand({
      TableName: PACKAGES_TABLE,
      Item: item,
    }));

    return item;
  }

  static async getById(packageId) {
    const result = await dynamodb.send(new GetCommand({
      TableName: PACKAGES_TABLE,
      Key: { packageId },
    }));

    return result.Item || null;
  }

  static async getByClientId(clientId) {
    const result = await dynamodb.send(new QueryCommand({
      TableName: PACKAGES_TABLE,
      IndexName: 'clientIdIndex',
      KeyConditionExpression: 'clientId = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
    }));

    return result.Items || [];
  }

  static async getByFileNumberId(fileNumberId) {
    try {
      const result = await dynamodb.send(new QueryCommand({
        TableName: PACKAGES_TABLE,
        IndexName: 'fileNumberIdIndex',
        KeyConditionExpression: 'fileNumberId = :fileNumberId',
        ExpressionAttributeValues: {
          ':fileNumberId': fileNumberId,
        },
      }));

      return result.Items || [];
    } catch (error) {
      // In SDK v3 error codes are on error.name instead of error.code
      if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') {
        const scanResult = await dynamodb.send(new ScanCommand({
          TableName: PACKAGES_TABLE,
          FilterExpression: 'fileNumberId = :fileNumberId',
          ExpressionAttributeValues: {
            ':fileNumberId': fileNumberId,
          },
        }));

        return scanResult.Items || [];
      }

      throw error;
    }
  }

  static async update(packageId, updates) {
    const updateData = { ...updates, updatedAt: new Date().toISOString() };

    const updateExpression = Object.keys(updateData)
      .map(key => `${key} = :${key}`)
      .join(', ');

    const expressionAttributeValues = {};
    Object.keys(updateData).forEach(key => {
      expressionAttributeValues[`:${key}`] = updateData[key];
    });

    await dynamodb.send(new UpdateCommand({
      TableName: PACKAGES_TABLE,
      Key: { packageId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    return await this.getById(packageId);
  }

  static async delete(packageId) {
    await dynamodb.send(new DeleteCommand({
      TableName: PACKAGES_TABLE,
      Key: { packageId },
    }));
  }
}

module.exports = Package;
