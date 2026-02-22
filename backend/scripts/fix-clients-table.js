require('dotenv').config();
const { DynamoDBClient, DeleteTableCommand, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
});

const deleteTable = async () => {
  try {
    console.log('Deleting clients table...');
    await dynamodb.send(new DeleteTableCommand({ TableName: 'clients' }));
    console.log('✓ Clients table deleted');

    // Wait a moment for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Creating clients table with GSI...');
    await dynamodb.send(new CreateTableCommand({
      TableName: 'clients',
      KeySchema: [{ AttributeName: 'clientId', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'clientId', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'userIdIndex',
          KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' }
        }
      ]
    }));

    console.log('✓ Clients table recreated with userIdIndex GSI');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

deleteTable();
