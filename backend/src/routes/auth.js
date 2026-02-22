const express = require('express');
const { adminMiddleware } = require('../middleware/auth');
const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
  AdminDeleteUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const router = express.Router();
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_hPpfv1YSS';
const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });

const getUserAttributes = (user) => {
  const attributes = {};
  user.Attributes?.forEach(attr => {
    attributes[attr.Name] = attr.Value;
  });
  return attributes;
};

const getUserGroups = async (username) => {
  const result = await cognito.send(new AdminListGroupsForUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
  }));

  return result.Groups?.map(group => group.GroupName) || [];
};

// Note: User registration and login now happens through Cognito hosted UI
// These endpoints manage users in Cognito after authentication

// Admin: Get all users from Cognito
router.get('/admin/users', adminMiddleware, async (req, res) => {
  try {
    const params = {
      UserPoolId: USER_POOL_ID,
      Limit: 60 // Max results per request
    };

    let allUsers = [];
    let paginationToken;

    // Paginate through all users
    do {
      if (paginationToken) {
        params.PaginationToken = paginationToken;
      }

      const result = await cognito.send(new ListUsersCommand(params));

      const users = await Promise.all(result.Users.map(async (user) => {
        const attributes = getUserAttributes(user);
        const groups = await getUserGroups(user.Username);

        return {
          userId: user.Username,
          sub: attributes.sub,
          email: attributes.email,
          name: attributes.name || attributes.preferred_username,
          picture: attributes.picture,
          createdAt: user.UserCreateDate?.toISOString(),
          lastModified: user.UserLastModifiedDate?.toISOString(),
          enabled: user.Enabled,
          status: user.UserStatus,
          groups,
          isAdmin: groups.includes('admin'),
        };
      }));

      allUsers = allUsers.concat(users);
      paginationToken = result.PaginationToken;
    } while (paginationToken);

    res.json(allUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Get pending users (users who have not been assigned to any group yet)
router.get('/admin/pending-users', adminMiddleware, async (req, res) => {
  try {
    const params = {
      UserPoolId: USER_POOL_ID,
      Limit: 60
    };

    let pendingUsers = [];
    let paginationToken;

    do {
      if (paginationToken) {
        params.PaginationToken = paginationToken;
      }

      const result = await cognito.send(new ListUsersCommand(params));

      const pending = (await Promise.all(result.Users.map(async (user) => {
        const attributes = getUserAttributes(user);
        const groups = await getUserGroups(user.Username);

        return {
          userId: user.Username,
          sub: attributes.sub,
          email: attributes.email,
          name: attributes.name || attributes.preferred_username,
          picture: attributes.picture,
          createdAt: user.UserCreateDate?.toISOString(),
          enabled: user.Enabled,
          status: user.UserStatus,
          groups,
        };
      }))).filter(user => !user.groups || user.groups.length === 0);

      pendingUsers = pendingUsers.concat(pending);
      paginationToken = result.PaginationToken;
    } while (paginationToken);

    res.json(pendingUsers);
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Admin: Delete user from Cognito
router.delete('/admin/users/:userId', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId
    }));

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Admin: Assign user to Cognito group
router.post('/admin/users/:userId/groups/:groupName', adminMiddleware, async (req, res) => {
  try {
    const { userId, groupName } = req.params;

    if (!['admin', 'user'].includes(groupName)) {
      return res.status(400).json({ error: 'Invalid group. Must be "admin" or "user"' });
    }

    await cognito.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      GroupName: groupName
    }));

    res.json({ message: `User added to ${groupName} group successfully` });
  } catch (error) {
    console.error('Add user to group error:', error);
    // In SDK v3 error codes are on error.name instead of error.code
    if (error.name === 'UserNotFoundException') {
      res.status(404).json({ error: 'User not found in Cognito' });
    } else {
      res.status(500).json({ error: 'Failed to add user to group' });
    }
  }
});

// Admin: Remove user from Cognito group
router.delete('/admin/users/:userId/groups/:groupName', adminMiddleware, async (req, res) => {
  try {
    const { userId, groupName } = req.params;

    if (!['admin', 'user'].includes(groupName)) {
      return res.status(400).json({ error: 'Invalid group. Must be "admin" or "user"' });
    }

    await cognito.send(new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      GroupName: groupName
    }));

    res.json({ message: `User removed from ${groupName} group successfully` });
  } catch (error) {
    console.error('Remove user from group error:', error);
    // In SDK v3 error codes are on error.name instead of error.code
    if (error.name === 'UserNotFoundException') {
      res.status(404).json({ error: 'User not found in Cognito' });
    } else {
      res.status(500).json({ error: 'Failed to remove user from group' });
    }
  }
});

module.exports = router;
