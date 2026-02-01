const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateToken, adminMiddleware } = require('../middleware/auth');
const { dynamodb } = require('../config/aws');

const router = express.Router();
const USERS_TABLE = process.env.DYNAMODB_TABLE_USERS || 'users';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { email }
    }).promise();

    if (existingUser.Item) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    await dynamodb.put({
      TableName: USERS_TABLE,
      Item: {
        email,
        userId,
        name,
        password: hashedPassword,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }).promise();

    // Don't issue token for unapproved users
    res.status(201).json({ 
      message: 'Account created. Pending admin approval.',
      user: { userId, email, name, approved: false } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const result = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { email }
    }).promise();

    if (!result.Item) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, result.Item.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is approved
    if (!result.Item.approved) {
      return res.status(403).json({ error: 'Account pending approval. Please contact an administrator.' });
    }

    const token = generateToken(result.Item.userId, { 
      email, 
      name: result.Item.name, 
      role: result.Item.role 
    });
    res.json({ 
      token, 
      user: { 
        userId: result.Item.userId, 
        email, 
        name: result.Item.name,
        role: result.Item.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin: Get all pending users
router.get('/admin/pending-users', adminMiddleware, async (req, res) => {
  try {
    const result = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'approved = :approved',
      ExpressionAttributeValues: {
        ':approved': false
      }
    }).promise();

    const users = result.Items.map(user => ({
      userId: user.userId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    }));

    res.json(users);
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Admin: Get all users
router.get('/admin/users', adminMiddleware, async (req, res) => {
  try {
    const result = await dynamodb.scan({
      TableName: USERS_TABLE
    }).promise();

    const users = result.Items.map(user => ({
      userId: user.userId,
      email: user.email,
      name: user.name,
      approved: user.approved,
      role: user.role,
      createdAt: user.createdAt,
      approvedAt: user.approvedAt
    }));

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Approve user
router.post('/admin/approve/:userId', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user by userId (need to scan since userId is not the key)
    const scanResult = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = scanResult.Items[0];

    // Update user
    await dynamodb.put({
      TableName: USERS_TABLE,
      Item: {
        ...user,
        approved: true,
        approvedBy: req.user.userId,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }).promise();

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Admin: Reject/Delete user
router.delete('/admin/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user by userId
    const scanResult = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = scanResult.Items[0];

    // Delete user
    await dynamodb.delete({
      TableName: USERS_TABLE,
      Key: { email: user.email }
    }).promise();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Admin: Update user role
router.put('/admin/users/:userId/role', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    // Find user by userId
    const scanResult = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = scanResult.Items[0];

    // Update user
    await dynamodb.put({
      TableName: USERS_TABLE,
      Item: {
        ...user,
        role,
        updatedAt: new Date().toISOString()
      }
    }).promise();

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

module.exports = router;
