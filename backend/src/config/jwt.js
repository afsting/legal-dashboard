const AWS = require('aws-sdk');

let cachedSecret = null;
let cachedSecretArn = null;

const parseSecretString = (secretString) => {
  if (!secretString) {
    return null;
  }

  try {
    const parsed = JSON.parse(secretString);
    if (parsed && typeof parsed.jwtSecret === 'string') {
      return parsed.jwtSecret;
    }
  } catch (error) {
    // Not JSON, use raw string.
  }

  return secretString;
};

const getJwtSecret = async () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  const secretArn = process.env.JWT_SECRET_ARN;
  if (!secretArn) {
    return 'your_secret_key';
  }

  if (cachedSecret && cachedSecretArn === secretArn) {
    return cachedSecret;
  }

  const client = new AWS.SecretsManager({
    region: process.env.AWS_REGION || 'us-east-1'
  });

  const result = await client.getSecretValue({ SecretId: secretArn }).promise();

  if (result.SecretString) {
    cachedSecret = parseSecretString(result.SecretString);
    cachedSecretArn = secretArn;
    return cachedSecret;
  }

  if (result.SecretBinary) {
    const decoded = Buffer.from(result.SecretBinary, 'base64').toString('utf-8');
    cachedSecret = parseSecretString(decoded);
    cachedSecretArn = secretArn;
    return cachedSecret;
  }

  return 'your_secret_key';
};

module.exports = {
  getJwtSecret
};
