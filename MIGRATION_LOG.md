# Backend Auth Migration - Cognito-Only Implementation

## Summary
Successfully migrated backend authentication from DynamoDB-based user management to AWS Cognito as the single source of truth. All admin endpoints now query Cognito directly.

## Changes Made

### 1. Backend Routes (`backend/src/routes/auth.js`)
**Before**: 428 lines - Mixed DynamoDB and legacy Cognito code  
**After**: 227 lines - Pure Cognito-only implementation  

**Key Endpoints Migrated**:
- `GET /admin/users` - Lists all Cognito users with groups and isAdmin flag
- `GET /admin/pending-users` - Filters users not yet assigned to any group
- `DELETE /admin/users/:userId` - Deletes user from Cognito
- `POST /admin/users/:userId/groups/:groupName` - Assigns user to admin/user group
- `DELETE /admin/users/:userId/groups/:groupName` - Removes user from group

### 2. Authentication Flow Changes
- **Registration**: Now handled entirely by Cognito hosted UI (OAuth + password signup)
- **Login**: OAuth redirect to Cognito hosted UI with Google/Facebook support
- **User Management**: Admin operations query Cognito via AWS SDK v2
- **Groups**: Two Cognito groups manage access ('admin' with precedence 0, 'user' with precedence 1)

### 3. Data Structure Changes
Users are now defined by:
```json
{
  "userId": "sub claim",
  "email": "from Cognito attributes",
  "name": "from Cognito attributes",
  "picture": "from Cognito attributes",
  "createdAt": "user creation timestamp",
  "lastModified": "last update timestamp",
  "enabled": true/false,
  "status": "CONFIRMED|UNCONFIRMED",
  "groups": ["admin", "user"],
  "isAdmin": true/false
}
```

## Deployment Status
✅ **Completed**
- CDK deployment: 64.97s
- Frontend built and synced to CloudFront
- Lambda function updated with new auth routes
- CloudFront cache invalidated

## Remaining Tasks
1. **Optional**: Delete legacy `users` DynamoDB table from CDK stack
2. **Testing**: Verify admin endpoints work with Cognito backend
3. **Cleanup**: Remove DYNAMODB_TABLE_USERS from environment variables
4. **Validation**: Confirm existing DynamoDB users data (if any) won't be needed

## API Compatibility
All admin endpoints now use Cognito user IDs (sub claim) instead of database record IDs.
Updates needed in frontend if hardcoded user IDs exist.

## Security Notes
- All admin routes require JWT with cognito:groups claim
- Group validation enforced on server side
- Cognito groups cannot be modified directly via API (must use AWS SDK)
- User lookup by sub claim ensures consistency with token authentication
