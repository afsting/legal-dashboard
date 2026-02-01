const AWS = require('aws-sdk');

// Configure AWS SDK to use LocalStack in development
if (process.env.NODE_ENV === 'development') {
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    s3ForcePathStyle: true,
    sslEnabled: false
  });
}

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

module.exports = {
  dynamodb,
  s3,
  AWS
};
