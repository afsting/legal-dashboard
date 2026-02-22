# Copilot Instructions — Legal Dashboard

## Project Summary
**Name**: Legal Dashboard (internal codename: Penny Page)
**Goal**: Legal case management system for law firms — clients → file numbers (cases) → documents → demand packages
**Status**: Active development; AI agent integration is a primary focus area
**Live URL**: https://d1a0t4zzh748tj.cloudfront.net
**API**: https://ozzx2wkqy1.execute-api.us-east-1.amazonaws.com/prod/

## Tech Stack
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite 7, Vue Router, Pinia
- **Auth**: AWS Cognito with Google OAuth via AWS Amplify UI (`@aws-amplify/ui-vue`)
- **Backend**: Node.js/Express, wrapped with `serverless-http` for AWS Lambda
- **Database**: AWS DynamoDB (multi-table, PAY_PER_REQUEST billing)
- **Storage**: AWS S3 — two buckets: documents + extracted text/analysis
- **AI**: AWS Bedrock agent (streaming InvokeAgent API, AWS SDK v3)
- **OCR**: AWS Textract (async, S3-sourced jobs)
- **Infrastructure**: AWS CDK v2 (TypeScript)
- **Local dev**: LocalStack via Docker Compose

## Project Structure
```
/
├── src/                          # Vue 3 frontend
│   ├── pages/                    # Route-level components
│   ├── components/               # Shared components (AgentSidebar, etc.)
│   ├── composables/              # Data-fetching hooks (useClients, useDocuments, etc.)
│   ├── stores/                   # Pinia stores (authStore)
│   ├── utils/api.js              # HTTP client with Cognito token management
│   ├── App.vue                   # Root layout, auth wrapper, header
│   └── router.js                 # 13 routes with auth guards
├── backend/
│   ├── src/
│   │   ├── app.js                # Express app setup
│   │   ├── lambda.js             # Lambda handler wrapper
│   │   ├── controllers/          # Request handlers
│   │   ├── models/               # DynamoDB data access
│   │   ├── routes/               # Express route definitions
│   │   ├── middleware/auth.js    # JWT/Cognito verification
│   │   └── config/aws.js         # DynamoDB/S3 client init
│   └── scripts/
│       ├── update-agent-instructions.js  # Deploy Bedrock agent prompt
│       ├── init-localstack.js            # Create local tables/buckets
│       └── make-admin.js                 # Approve admin users
├── infrastructure/
│   └── lib/legal-dashboard-stack.ts  # CDK stack (all AWS resources)
└── CLAUDE.md                     # Claude Code AI assistant instructions
```

## Data Model & Relationships
```
Client (clientId PK)
  └─ FileNumber (fileId PK, clientId GSI)
       └─ Document (fileId PK + documentId SK)
       └─ Package (packageId PK, fileNumberIdIndex GSI)
            └─ Workflow (workflowId PK, packageId GSI)
```

### DynamoDB Tables
| Table | PK | SK | GSIs |
|---|---|---|---|
| clients | clientId | — | userIdIndex |
| file-numbers | fileId | — | clientIdIndex, packageIdIndex |
| documents | fileId | documentId | — |
| packages | packageId | — | clientIdIndex, fileNumberIdIndex |
| workflows | workflowId | — | packageIdIndex |

## Key Architectural Decisions

### S3 Naming Convention
All S3 keys use a consistent hierarchy. **Always follow this pattern — never construct paths inline:**
```
clients/{clientId}/file-numbers/{fileNumber}/docs/{fileName}
clients/{clientId}/file-numbers/{fileNumber}/extracted-text/{documentId}.txt.gz
clients/{clientId}/file-numbers/{fileNumber}/analysis/{documentId}.txt.gz
```
Use `clientId` (UUID) and `fileNumber` (human-readable string, e.g. "2024-001"), not internal IDs alone.
Always use the dedicated key-builder functions: `buildExtractedTextS3Key()` and `buildAnalysisS3Key()`.

### DynamoDB 400KB Item Limit
Large text content must never be stored directly in DynamoDB:
- Extracted document text → S3 (`extractedTextS3Key`), gzipped
- Full AI analysis → S3 (`analysisS3Key`), gzipped
- AI analysis preview → DynamoDB `analysis` field, capped at 500 characters
- Store S3 key references in DynamoDB; fetch content on demand

### Document Upload Flow (Presigned URLs)
Direct S3 upload bypasses Lambda/API Gateway size limits:
1. `POST /file-numbers/:fileId/documents/presigned-url` → get signed PUT URL
2. Client PUTs directly to S3
3. `POST /file-numbers/:fileId/documents/confirm` → create DynamoDB record

### Soft Deletes
Documents are never hard-deleted. `deletedAt` + `deletedBy` mark deletion; S3 versions are preserved.

## AI / Agent Integration
- Agent configured via env vars: `BEDROCK_AGENT_ID`, `BEDROCK_AGENT_ALIAS_ID`
- Agent queries include current client/file number context (injected by `agentController.js`)
- Document analysis: Textract extracts text → stored in S3 → Bedrock invoked asynchronously
- Agent instructions managed via `backend/scripts/update-agent-instructions.js`
- **Prompt/instruction development is a primary focus** — treat agent instructions as versioned config

## Route Structure
```
/                                               → ClientsListPage
/client/:clientId                               → ClientDetailPage
/client/:clientId/file/:fileNumberId            → FileNumberDetailPage
/client/:clientId/file/:fileNumberId/packages   → DemandPackagesPage
/client/:clientId/file/:fileNumberId/packages/create → PackageCreatePage
/package/:id                                    → PackageDetailPage
/package/:id/workflow                           → WorkflowPage
/admin/users                                    → AdminUsersPage
/settings                                       → SettingsPage
```

## Known Technical Debt
- AWS SDK v2 still used in most controllers/models (v3 only for Bedrock + Textract)
- `conversationHistory` still stored in DynamoDB (needs S3 migration like extracted text)
- Legacy JWT auth system still present alongside Cognito; Cognito should be the only auth path

## Coding Standards & Development Guidelines

### 1. Begin With an Intent Block
Before generating code, define:
- The purpose of the file or function
- Expected inputs and outputs
- Constraints or edge cases

### 2. Define Data Shapes Before Implementing Logic
Generate these first: JSDoc types, schemas, enums. This ensures predictable structure.

### 3. Produce Small, Single-Responsibility Functions
Break tasks into clear steps using comments:
```javascript
// Step 1: Validate input
// Step 2: Fetch from DynamoDB
// Step 3: Load large content from S3
// Step 4: Return response
```

### 4. Prefer Refactoring Over Extending
When modifying existing code: rewrite for clarity, remove duplication, simplify logic.
**Do not extend messy or unclear code.**

### 5. Follow Existing Patterns
- Vue: Composition API with `<script setup>`, reactive refs, composables for data fetching
- Backend: Express controllers returning JSON, consistent error shapes
- Error handling: `try/catch` with specific messages; 400 for bad input, 404 for not found, 503 for unavailable
- Logging: `console.error` for errors, `console.log` for debug

### 6. S3 Key Rule
Never construct S3 keys as inline strings. Always use the key-builder functions.

### 7. DynamoDB Size Rule
Never store large text blobs in DynamoDB. Extracted text and AI analysis go to S3; only metadata and short previews stay in DynamoDB.

### 8. Treat TODO Comments as Authoritative
When TODOs are present, implement them directly.

### Summary
Prioritize:
- Clarity over cleverness
- Structure over speed
- Small functions over monolithic blocks
- Predictable patterns over innovation
- Adherence to intent
- Refactoring over extension

## Environment Variables
```
# Backend
NODE_ENV=development|production
JWT_SECRET=...
AWS_REGION=us-east-1
DYNAMODB_TABLE_CLIENTS=clients
DYNAMODB_TABLE_FILE_NUMBERS=file-numbers
DYNAMODB_TABLE_DOCUMENTS=documents
DYNAMODB_TABLE_PACKAGES=packages
DYNAMODB_TABLE_WORKFLOWS=workflows
S3_BUCKET_DOCUMENTS=legal-documents
S3_BUCKET_EXTRACTED_TEXT=legal-extracted-text
BEDROCK_AGENT_ID=...
BEDROCK_AGENT_ALIAS_ID=...
CORS_ORIGIN=https://d1a0t4zzh748tj.cloudfront.net

# Frontend
VITE_API_URL=http://localhost:5000/api
```

## Local Development
```bash
# Start LocalStack
docker-compose up -d

# Init tables and buckets
cd backend && npm run init-localstack

# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 5173)
npm run dev
```
