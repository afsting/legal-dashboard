require('dotenv').config();
const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');

const localStackConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
};

const dynamodb = new DynamoDBClient(localStackConfig);
const s3 = new S3Client({ ...localStackConfig, forcePathStyle: true });

const tables = [
  {
    TableName: process.env.DYNAMODB_TABLE_CLIENTS || 'clients',
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
  },
  {
    TableName: process.env.DYNAMODB_TABLE_PACKAGES || 'packages',
    KeySchema: [{ AttributeName: 'packageId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'packageId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: process.env.DYNAMODB_TABLE_FILE_NUMBERS || 'file-numbers',
    KeySchema: [{ AttributeName: 'fileId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'fileId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: process.env.DYNAMODB_TABLE_WORKFLOWS || 'workflows',
    KeySchema: [{ AttributeName: 'workflowId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'workflowId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: process.env.DYNAMODB_TABLE_DOCUMENTS || 'documents',
    KeySchema: [
      { AttributeName: 'fileId', KeyType: 'HASH' },
      { AttributeName: 'documentId', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'fileId', AttributeType: 'S' },
      { AttributeName: 'documentId', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
];

const initializeDynamoDB = async () => {
  console.log('Initializing DynamoDB tables...');
  for (const table of tables) {
    try {
      await dynamodb.send(new CreateTableCommand(table));
      console.log(`✓ Created table: ${table.TableName}`);
    } catch (error) {
      if (error.name === 'ResourceInUseException') {
        console.log(`✓ Table already exists: ${table.TableName}`);
      } else {
        console.error(`✗ Error creating table ${table.TableName}:`, error.message);
      }
    }
  }
};

const initializeS3 = async () => {
  console.log('Initializing S3 buckets...');
  const buckets = [process.env.S3_BUCKET_DOCUMENTS || 'legal-documents'];

  for (const bucket of buckets) {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`✓ Created bucket: ${bucket}`);
    } catch (error) {
      if (error.name === 'BucketAlreadyOwnedByYou') {
        console.log(`✓ Bucket already exists: ${bucket}`);
      } else {
        console.error(`✗ Error creating bucket ${bucket}:`, error.message);
      }
    }
  }
};

const initialize = async () => {
  try {
    console.log('Starting LocalStack initialization...\n');
    await initializeDynamoDB();
    console.log();
    await initializeS3();
    console.log('\n✓ LocalStack initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
};

initialize();
