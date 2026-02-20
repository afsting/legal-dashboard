# Legal Dashboard Backend

Node.js/Express backend with JWT authentication, AWS DynamoDB, and S3 document storage with presigned URL uploads.

## Setup

### Local Development (LocalStack)

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Start LocalStack (from project root):
```bash
docker-compose up -d
```

4. Initialize LocalStack (creates DynamoDB tables and S3 buckets):
```bash
npm run init-localstack
```

5. Start the backend:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Production (AWS)

Backend is deployed as AWS Lambda function via CDK:
- **Function**: LegalDashboardStack-BackendFunction
- **API Gateway**: https://ozzx2wkqy1.execute-api.us-east-1.amazonaws.com/prod/
- **Region**: us-east-1

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Clients
- `GET /api/clients` - List all clients (firm-wide)
- `POST /api/clients` - Create new client
- `GET /api/clients/:clientId` - Get client details
- `PUT /api/clients/:clientId` - Update client
- `DELETE /api/clients/:clientId` - Delete client

### File Numbers
- `POST /api/file-numbers` - Create file number
- `GET /api/file-numbers/:fileId` - Get file number
- `GET /api/file-numbers/client/:clientId` - List by client
- `GET /api/file-numbers/package/:packageId` - List by package
- `PUT /api/file-numbers/:fileId` - Update file number
- `DELETE /api/file-numbers/:fileId` - Delete file number

### Documents (S3 Presigned URL Upload)
- `POST /api/file-numbers/:fileId/documents/presigned-url` - Get upload URL
- `POST /api/file-numbers/:fileId/documents/confirm` - Confirm upload
- `GET /api/file-numbers/:fileId/documents` - List documents
- `GET /api/file-numbers/:fileId/documents/:documentId/versions` - List versions
- `DELETE /api/file-numbers/:fileId/documents/:documentId` - Soft delete

### Packages & Workflows
- Standard CRUD operations for packages and workflows

## Environment Variables

Required environment variables (set by CDK in production, manually in local .env):

```env
NODE_ENV=development|production
PORT=5000
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566  # LocalStack only
AWS_ACCESS_KEY_ID=test              # LocalStack only
AWS_SECRET_ACCESS_KEY=test          # LocalStack only
DYNAMODB_TABLE_USERS=users
DYNAMODB_TABLE_CLIENTS=clients
DYNAMODB_TABLE_PACKAGES=packages
DYNAMODB_TABLE_FILE_NUMBERS=file-numbers
DYNAMODB_TABLE_WORKFLOWS=workflows
DYNAMODB_TABLE_DOCUMENTS=documents
S3_BUCKET_DOCUMENTS=legal-documents-dev
CORS_ORIGIN=http://localhost:5173
```

See `.env.example` for all available configuration options.

## Project Structure

```
src/
├── server.js               # Express app entry point
├── lambda.js               # AWS Lambda handler wrapper
├── config/
│   └── aws.js             # AWS SDK configuration (DynamoDB, S3)
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── clients.js         # Client CRUD routes
│   ├── fileNumbers.js     # File numbers + document routes
│   ├── packages.js        # Package routes
│   └── workflows.js       # Workflow routes
├── controllers/
│   ├── authController.js        # User registration & login
│   ├── clientController.js      # Client management (firm-wide)
│   ├── fileNumberController.js  # File number operations
│   ├── documentController.js    # Document metadata operations
│   ├── uploadController.js      # S3 presigned URL generation
│   ├── packageController.js     # Package management
│   └── workflowController.js    # Workflow management
└── models/
    ├── User.js            # User model (email PK)
    ├── Client.js          # Client model (firm-wide, createdBy field)
    ├── FileNumber.js      # File number model (handles NULL GSI keys)
    ├── Document.js        # Document model with versioning & soft delete
    ├── Package.js         # Package model
    └── Workflow.js        # Workflow model

scripts/
├── init-localstack.js     # Initialize LocalStack DynamoDB tables & S3 buckets
├── make-admin.js          # Approve users as admins
└── fix-clients-table.js   # Utility to fix client data
```

## Key Technical Details

### Document Upload Architecture
- **Flow**: Frontend → Presigned URL → Direct S3 Upload → Confirm with Backend
- **Benefits**: Bypasses API Gateway 10MB limit, supports up to 5GB files
- **Versioning**: S3 versioning enabled, same filename creates new version
- **Soft Delete**: Document metadata marked as deleted, S3 versions preserved

### Important Considerations
1. **DynamoDB GSI Keys**: Cannot be NULL - omit attribute entirely if not set
   - Fixed in `FileNumber.js` to prevent validation errors
2. **Client Visibility**: All clients are firm-wide (not user-scoped)
   - Changed from `getByUserId()` to `getAll()` in `Client.js`
3. **AWS SDK**: Currently using SDK v2 (deprecated), v3 migration needed

### Testing & Debugging
```bash
# View Lambda logs (production)
aws logs tail /aws/lambda/LegalDashboardStack-BackendFunction --follow --region us-east-1

# Query DynamoDB (production)
aws dynamodb scan --table-name clients --region us-east-1

# List S3 documents (production)
aws s3 ls s3://legal-documents-315326805073-us-east-1/clients/ --recursive
```
