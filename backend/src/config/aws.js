/**
 * INTENT: Central AWS SDK v3 client configuration.
 * In development, all clients point to LocalStack via the AWS_ENDPOINT_URL env var.
 * In production, clients use IAM role credentials from the Lambda/ECS environment.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION || 'us-east-1';

const isLocalStack = process.env.NODE_ENV === 'development';

const baseConfig = isLocalStack
  ? {
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    }
  : { region: REGION };

const dynamodbClient = new DynamoDBClient(baseConfig);
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const s3 = new S3Client({
  ...baseConfig,
  forcePathStyle: isLocalStack, // Required for LocalStack S3 path-style URLs
});

module.exports = { dynamodb, s3 };
