# Infrastructure Architecture

## Overview
Legal Dashboard is a full-stack application with local AWS emulation for development using LocalStack.

## System Components

### Frontend
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite 7.2.5
- **Dev Server**: http://localhost:5173
- **State Management**: Pinia stores + Composables pattern
- **Routing**: Vue Router with authentication guards

### Backend
- **Framework**: Node.js with Express.js
- **Port**: 5000
- **API Prefix**: `/api`
- **Authentication**: JWT tokens (7-day expiry)
- **Password Hashing**: bcryptjs

### Database
- **Service**: DynamoDB (via LocalStack)
- **Access**: AWS SDK v2 (migration to v3 planned)
- **Endpoint**: http://localhost:4566

### Storage
- **Service**: S3 (via LocalStack)
- **Bucket**: legal-documents-dev
- **Endpoint**: http://localhost:4566

### Infrastructure as Code
- **Tool**: AWS CDK with TypeScript
- **Location**: `/infrastructure` directory
- **Default Account**: 123456789012 (LocalStack)

## Service Architecture

```
┌─────────────────┐
│   Vue 3 App     │  Port 5173
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  Express API    │  Port 5000
│   (Backend)     │
└────────┬────────┘
         │ AWS SDK
         ▼
┌─────────────────┐
│   LocalStack    │  Port 4566
│  (DynamoDB/S3)  │
└─────────────────┘
```

## Development Setup

### LocalStack
- **Container**: Docker Desktop
- **Port**: 4566
- **Services**: DynamoDB, S3
- **Initialization**: `backend/scripts/init-localstack.js`

### Environment Variables

#### Backend (.env)
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
DYNAMODB_TABLE_USERS=users
DYNAMODB_TABLE_CLIENTS=clients
DYNAMODB_TABLE_PACKAGES=packages
DYNAMODB_TABLE_FILE_NUMBERS=file-numbers
DYNAMODB_TABLE_WORKFLOWS=workflows
S3_BUCKET_DOCUMENTS=legal-documents-dev
```

#### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Deployment Considerations

### Current State
- Local development only with LocalStack
- JWT authentication (not Cognito)
- AWS SDK v2 (deprecated, needs migration)

### Production Migration Path
1. Migrate to AWS SDK v3
2. Replace LocalStack endpoints with real AWS endpoints
3. Update environment variables for production
4. Configure AWS IAM roles and policies
5. Consider migrating to AWS Cognito for authentication
6. Set up CloudFront for frontend distribution
7. Use AWS Secrets Manager for sensitive credentials

## API Structure

### Authentication Flow
1. User registers → JWT token issued
2. Token stored in localStorage
3. Token sent in Authorization header: `Bearer {token}`
4. Backend middleware validates token on protected routes
5. Expired tokens redirect to login

### Route Protection
- All `/api/*` routes except `/api/auth/*` require authentication
- Frontend router guards check `isAuthenticated` before navigation
- Unauthenticated users redirected to `/login`
- Authenticated users on `/login` or `/register` redirected to `/dashboard`
