require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { dynamodb } = require('../src/config/aws');
const bcrypt = require('bcryptjs');

const USERS_TABLE = process.env.DYNAMODB_TABLE_USERS || 'users';

async function resetPassword(email, newPassword) {
  try {
    console.log(`Resetting password for ${email}...`);
    
    // Get the user
    const result = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { email }
    }).promise();

    if (!result.Item) {
      console.log(`User ${email} not found.`);
      return;
    }

    const user = result.Item;
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user with new password
    await dynamodb.put({
      TableName: USERS_TABLE,
      Item: {
        ...user,
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      }
    }).promise();

    console.log(`\n✓ Password reset successfully for ${email}`);
    console.log(`New password: ${newPassword}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

const email = process.argv[2];
const newPassword = process.argv[3] || 'Password123!';

if (!email) {
  console.log('Usage: node reset-password.js <email> [newPassword]');
  console.log('Example: node reset-password.js user@example.com MyNewPass123');
  process.exit(1);
}

resetPassword(email, newPassword);
