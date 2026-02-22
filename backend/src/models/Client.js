const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');
const { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const CLIENTS_TABLE = process.env.DYNAMODB_TABLE_CLIENTS || 'clients';

class Client {
  static async create(createdBy, clientData) {
    const clientId = uuidv4();
    const item = {
      clientId,
      createdBy,
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone || null,
      address: clientData.address || null,
      status: clientData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.send(new PutCommand({
      TableName: CLIENTS_TABLE,
      Item: item,
    }));

    return item;
  }

  static async getById(clientId) {
    const result = await dynamodb.send(new GetCommand({
      TableName: CLIENTS_TABLE,
      Key: { clientId },
    }));

    return result.Item || null;
  }

  static async getAll() {
    const result = await dynamodb.send(new ScanCommand({
      TableName: CLIENTS_TABLE,
    }));

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

    await dynamodb.send(new UpdateCommand({
      TableName: CLIENTS_TABLE,
      Key: { clientId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    return await this.getById(clientId);
  }

  static async delete(clientId) {
    await dynamodb.send(new DeleteCommand({
      TableName: CLIENTS_TABLE,
      Key: { clientId },
    }));
  }
}

module.exports = Client;
