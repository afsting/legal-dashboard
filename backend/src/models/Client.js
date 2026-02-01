const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');

const CLIENTS_TABLE = process.env.DYNAMODB_TABLE_CLIENTS || 'clients';

class Client {
  static async create(userId, clientData) {
    const clientId = uuidv4();
    const item = {
      clientId,
      userId,
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone || null,
      address: clientData.address || null,
      status: clientData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.put({
      TableName: CLIENTS_TABLE,
      Item: item,
    }).promise();

    return item;
  }

  static async getById(clientId) {
    const result = await dynamodb.get({
      TableName: CLIENTS_TABLE,
      Key: { clientId },
    }).promise();

    return result.Item || null;
  }

  static async getByUserId(userId) {
    const result = await dynamodb.query({
      TableName: CLIENTS_TABLE,
      IndexName: 'userIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }).promise();

    return result.Items || [];
  }

  static async update(clientId, updates) {
    const updateData = { ...updates, updatedAt: new Date().toISOString() };
    
    const updateExpression = Object.keys(updateData)
      .map(key => `${key} = :${key}`)
      .join(', ');
    
    const expressionAttributeValues = {};
    Object.keys(updateData).forEach(key => {
      expressionAttributeValues[`:${key}`] = updateData[key];
    });

    await dynamodb.update({
      TableName: CLIENTS_TABLE,
      Key: { clientId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    return await this.getById(clientId);
  }

  static async delete(clientId) {
    await dynamodb.delete({
      TableName: CLIENTS_TABLE,
      Key: { clientId },
    }).promise();
  }
}

module.exports = Client;
