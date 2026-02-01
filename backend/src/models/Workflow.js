const { v4: uuidv4 } = require('uuid');
const { dynamodb } = require('../config/aws');

const WORKFLOWS_TABLE = process.env.DYNAMODB_TABLE_WORKFLOWS || 'workflows';

class Workflow {
  static async create(packageId, workflowData) {
    const workflowId = uuidv4();
    const item = {
      workflowId,
      packageId,
      name: workflowData.name,
      description: workflowData.description || null,
      status: workflowData.status || 'draft',
      steps: workflowData.steps || [],
      currentStep: workflowData.currentStep || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.put({
      TableName: WORKFLOWS_TABLE,
      Item: item,
    }).promise();

    return item;
  }

  static async getById(workflowId) {
    const result = await dynamodb.get({
      TableName: WORKFLOWS_TABLE,
      Key: { workflowId },
    }).promise();

    return result.Item || null;
  }

  static async getByPackageId(packageId) {
    const result = await dynamodb.query({
      TableName: WORKFLOWS_TABLE,
      IndexName: 'packageIdIndex',
      KeyConditionExpression: 'packageId = :packageId',
      ExpressionAttributeValues: {
        ':packageId': packageId,
      },
    }).promise();

    return result.Items || [];
  }

  static async update(workflowId, updates) {
    const updateData = { ...updates, updatedAt: new Date().toISOString() };
    
    const updateExpression = Object.keys(updateData)
      .map(key => `${key} = :${key}`)
      .join(', ');
    
    const expressionAttributeValues = {};
    Object.keys(updateData).forEach(key => {
      expressionAttributeValues[`:${key}`] = updateData[key];
    });

    await dynamodb.update({
      TableName: WORKFLOWS_TABLE,
      Key: { workflowId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    return await this.getById(workflowId);
  }

  static async delete(workflowId) {
    await dynamodb.delete({
      TableName: WORKFLOWS_TABLE,
      Key: { workflowId },
    }).promise();
  }
}

module.exports = Workflow;
