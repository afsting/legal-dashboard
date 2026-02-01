require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { dynamodb } = require('../src/config/aws');

const USERS_TABLE = process.env.DYNAMODB_TABLE_USERS || 'users';

async function makeFirstUserAdmin() {
  try {
    console.log('Scanning for users...');
    
    const result = await dynamodb.scan({
      TableName: USERS_TABLE
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      console.log('No users found. Please register a user first.');
      return;
    }

    // Get the first user (oldest by creation date)
    const users = result.Items.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    const firstUser = users[0];
    
    console.log(`\nFound first user: ${firstUser.email} (${firstUser.name})`);
    console.log(`Current status: approved=${firstUser.approved}, role=${firstUser.role}`);

    // Update user to be approved admin
    await dynamodb.put({
      TableName: USERS_TABLE,
      Item: {
        ...firstUser,
        approved: true,
        role: 'admin',
        approvedBy: 'system',
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }).promise();

    console.log(`\n✓ Successfully made ${firstUser.email} an approved admin!`);
    console.log('You can now log in with this account.');

  } catch (error) {
    console.error('Error:', error);
  }
}

makeFirstUserAdmin();
