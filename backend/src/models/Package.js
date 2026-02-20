const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');

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

    await dynamodb.put({
      TableName: PACKAGES_TABLE,
      Item: item,
    }).promise();

    return item;
  }

  static async getById(packageId) {
    const result = await dynamodb.get({
      TableName: PACKAGES_TABLE,
      Key: { packageId },
    }).promise();

    return result.Item || null;
  }

  static async getByClientId(clientId) {
    const result = await dynamodb.query({
      TableName: PACKAGES_TABLE,
      IndexName: 'clientIdIndex',
      KeyConditionExpression: 'clientId = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
    }).promise();

    return result.Items || [];
  }

  static async getByFileNumberId(fileNumberId) {
    try {
      const result = await dynamodb.query({
        TableName: PACKAGES_TABLE,
        IndexName: 'fileNumberIdIndex',
        KeyConditionExpression: 'fileNumberId = :fileNumberId',
        ExpressionAttributeValues: {
          ':fileNumberId': fileNumberId,
        },
      }).promise();

      return result.Items || [];
    } catch (error) {
      if (error.code === 'ValidationException' || error.code === 'ResourceNotFoundException') {
        const scanResult = await dynamodb.scan({
          TableName: PACKAGES_TABLE,
          FilterExpression: 'fileNumberId = :fileNumberId',
          ExpressionAttributeValues: {
            ':fileNumberId': fileNumberId,
          },
        }).promise();

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

    await dynamodb.update({
      TableName: PACKAGES_TABLE,
      Key: { packageId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    return await this.getById(packageId);
  }

  static async delete(packageId) {
    await dynamodb.delete({
      TableName: PACKAGES_TABLE,
      Key: { packageId },
    }).promise();
  }
}

module.exports = Package;
