# Legal Dashboard - Full Setup Guide

This is a complete Vue 3 + Node.js legal dashboard with AWS LocalStack integration.

## Architecture

```
Frontend (Vue 3)          →  Backend (Node.js/Express)  →  LocalStack (Docker)
port 5173                    port 5000                      port 4566
                             JWT Auth                        DynamoDB + S3
```

## Prerequisites

- Node.js 14+
- Docker
- npm or yarn

## Quick Start

### 1. Setup LocalStack (Docker)

```bash
cd legal_dashboard
docker-compose up -d
```

Verify LocalStack is running:
```bash
docker-compose ps
```

### 2. Setup Backend Infrastructure (CDK)

```bash
cd infrastructure
npm install

# Deploy CDK to LocalStack
.\deploy-localstack.bat  # Windows
# or
bash deploy-localstack.sh  # Mac/Linux
```

This creates all DynamoDB tables and S3 buckets.

### 3. Start Backend Server

```bash
cd ../backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### 4. Start Frontend

In a new terminal:
```bash
cd legal_dashboard
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Default Credentials

The system doesn't have pre-seeded users. You can:

1. **Register** a new account: http://localhost:5173/register
2. **Login** with your credentials: http://localhost:5173/login

## Project Structure

```
legal_dashboard/
├── src/                          # Vue frontend
│   ├── composables/              # Reusable Vue composables
│   │   ├── useAuth.js           # Authentication
│   │   ├── useClients.js        # Client operations
│   │   ├── usePackages.js       # Package operations
│   │   ├── useFileNumbers.js    # File number operations
│   │   └── useWorkflows.js      # Workflow operations
│   ├── utils/
│   │   └── api.js               # API client (fetch wrapper)
│   ├── pages/                    # Vue pages/routes
│   ├── stores/                   # Pinia stores (auth)
│   └── App.vue
├── backend/                      # Node.js/Express backend
│   ├── src/
│   │   ├── server.js            # Express app entry
│   │   ├── config/aws.js        # AWS SDK setup
│   │   ├── middleware/auth.js   # JWT middleware
│   │   ├── routes/              # API route handlers
│   │   ├── controllers/         # Business logic
│   │   ├── models/              # DynamoDB models
│   │   └── utils/
│   ├── scripts/init-localstack.js
│   └── API.md                   # API documentation
├── infrastructure/               # AWS CDK
│   ├── lib/legal-dashboard-stack.ts
│   └── bin/app.ts
└── docker-compose.yml           # LocalStack config
```

## Key Features

### Authentication
- **JWT-based**: Stateless authentication
- **Secure**: Password hashing with bcryptjs
- **Register/Login**: `/register` and `/login` pages

### API Endpoints (All Protected with JWT)

**Clients**
- `POST /api/clients` - Create client
- `GET /api/clients` - List user's clients
- `GET /api/clients/{clientId}` - Get specific client
- `PUT /api/clients/{clientId}` - Update client
- `DELETE /api/clients/{clientId}` - Delete client

**Packages**
- `POST /api/packages` - Create package
- `GET /api/packages/client/{clientId}` - List packages for client
- `GET /api/packages/{packageId}` - Get specific package
- `PUT /api/packages/{packageId}` - Update package
- `DELETE /api/packages/{packageId}` - Delete package

**File Numbers**
- `POST /api/file-numbers` - Create file number
- `GET /api/file-numbers/package/{packageId}` - List file numbers
- `GET /api/file-numbers/{fileId}` - Get specific file number
- `PUT /api/file-numbers/{fileId}` - Update file number
- `DELETE /api/file-numbers/{fileId}` - Delete file number

**Workflows**
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/package/{packageId}` - List workflows
- `GET /api/workflows/{workflowId}` - Get specific workflow
- `PUT /api/workflows/{workflowId}` - Update workflow
- `DELETE /api/workflows/{workflowId}` - Delete workflow

See [backend/API.md](backend/API.md) for complete API documentation with examples.

## Database Schema

### DynamoDB Tables

**users**
- Partition Key: `email`
- Stores user accounts with hashed passwords

**clients**
- Partition Key: `clientId`
- Global Secondary Index: `userIdIndex` (query by userId)

**packages**
- Partition Key: `packageId`
- Global Secondary Index: `clientIdIndex` (query by clientId)

**file-numbers**
- Partition Key: `fileId`
- Global Secondary Index: `packageIdIndex` (query by packageId)

**workflows**
- Partition Key: `workflowId`
- Global Secondary Index: `packageIdIndex` (query by packageId)

**S3 Buckets**
- `legal-documents-*` - Document storage with versioning

## Development Workflow

1. **Register a new user** or login with existing credentials
2. **Create clients** - Add your legal clients
3. **Create packages** - Add legal packages for each client
4. **Create file numbers** - Track case file numbers
5. **Create workflows** - Define and track workflow steps

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Create Client (use token from login response)
curl -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Client Name","email":"client@example.com"}'
```

## Useful Commands

```bash
# Frontend
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build

# Backend
npm run dev        # Start with nodemon
npm start          # Start production

# Infrastructure
npm run cdk:synth  # Generate CloudFormation
npm run cdk:diff   # See what will be deployed
npm run cdk:deploy # Deploy to AWS
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566
CORS_ORIGIN=http://localhost:5173
```

## Deployment

### Deploy Backend to AWS (EC2)

1. Create EC2 instance
2. Install Node.js
3. Clone repo and install dependencies
4. Update `.env` with real AWS credentials (no `AWS_ENDPOINT_URL`)
5. Run `npm start`

### Deploy Frontend to AWS (S3 + CloudFront)

1. Build: `npm run build`
2. Upload `dist/` to S3
3. Configure CloudFront for CDN
4. Update API_URL to point to backend domain

## Troubleshooting

**LocalStack not connecting?**
- Ensure Docker is running: `docker ps`
- Check port 4566 is accessible: `telnet localhost 4566`
- View logs: `docker-compose logs localstack`

**Backend errors?**
- Check backend is running: `http://localhost:5000/api/health`
- Check JWT token is being sent in Authorization header
- View backend logs in terminal

**Frontend not loading?**
- Check `VITE_API_URL` is set correctly
- Open browser DevTools → Network tab
- Check CORS headers on API responses

## Next Steps

1. **Create more pages** for specific features (client detail, package detail, etc.)
2. **Add file upload** to S3 for documents
3. **Implement workflows** with step tracking
4. **Add notifications** via SNS
5. **Deploy to production** AWS

## Support

For issues, check:
- [Backend API Documentation](backend/API.md)
- [Infrastructure CDK Code](infrastructure/lib/legal-dashboard-stack.ts)
- Console logs (browser DevTools and terminal)
