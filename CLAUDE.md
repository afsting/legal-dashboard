# CLAUDE.md — Claude Code Instructions for Legal Dashboard

## Project Summary
**Name**: Legal Dashboard (internal codename: Penny Page)
**Goal**: Legal case management system for law firms — clients → file numbers (cases) → documents → demand packages
**Status**: Active development; AI agent integration is a primary focus area

## Tech Stack
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite 7, Vue Router, Pinia
- **Auth**: AWS Cognito with Google OAuth via AWS Amplify UI (legacy JWT system being phased out)
- **Backend**: Node.js/Express wrapped with serverless-http for AWS Lambda
- **Database**: AWS DynamoDB (multi-table, PAY_PER_REQUEST)
- **Storage**: AWS S3 — two buckets: documents + extracted text/analysis
- **AI**: AWS Bedrock agent (InvokeAgent API, streaming responses)
- **OCR**: AWS Textract (async, S3-sourced)
- **Infrastructure**: AWS CDK v2 (TypeScript)
- **Local dev**: LocalStack via Docker

## Key Architectural Decisions

### S3 Naming Convention
All S3 keys use a consistent hierarchy mirroring the data model. **Always follow this pattern:**
```
clients/{clientId}/file-numbers/{fileNumber}/docs/{fileName}          ← document files
clients/{clientId}/file-numbers/{fileNumber}/extracted-text/{documentId}.txt.gz
clients/{clientId}/file-numbers/{fileNumber}/analysis/{documentId}.txt.gz
```
Use `clientId` (UUID) and `fileNumber` (human-readable string, e.g. "2024-001"), not internal IDs alone.

### DynamoDB Size Rule
DynamoDB items have a 400KB limit. **Large text content must never be stored directly in DynamoDB.**
- Extracted document text → S3 (`extractedTextS3Key`), gzipped
- AI analysis (full) → S3 (`analysisS3Key`), gzipped
- AI analysis (preview) → DynamoDB `analysis` field, capped at 500 chars
- S3 key references stored in DynamoDB so content can be fetched on demand

### Document Lifecycle
1. Upload → S3 presigned PUT URL (bypasses Lambda 10MB limit)
2. Confirm → DynamoDB metadata record created
3. Analyze → Textract extracts text → stored in S3 → Bedrock agent invoked async
4. Chat → extracted text loaded from S3 → sent to Bedrock with conversation history

### Soft Deletes
Documents are never hard-deleted. `deletedAt` + `deletedBy` fields mark deletion; S3 versions are preserved.

## Data Model Relationships
```
Client (clientId PK)
  └─ FileNumber (fileId PK, clientId GSI)
       └─ Document (fileId PK + documentId SK)
       └─ Package (packageId PK, fileNumberIdIndex GSI)
            └─ Workflow (workflowId PK, packageId GSI)
```

## AI / Agent Integration
- Agent ID and Alias ID come from env vars: `BEDROCK_AGENT_ID`, `BEDROCK_AGENT_ALIAS_ID`
- Agent is context-aware: current client and file number are injected into queries
- Agent instructions are managed via `backend/scripts/update-agent-instructions.js`
- Prompt/instruction development is a key focus — treat agent instructions as versioned config

## Known Technical Debt
- AWS SDK v2 still used in most controllers/models (v3 only in Bedrock + Textract); migration pending
- `conversationHistory` still stored in DynamoDB — same S3 migration needed as extracted text/analysis
- Legacy JWT auth system still present alongside Cognito; should be fully removed

## Development Guidelines

### S3 Key Builders
Always use the dedicated key-builder functions — never construct S3 paths inline:
- `buildExtractedTextS3Key(clientId, fileNumber, documentId)`
- `buildAnalysisS3Key(clientId, fileNumber, documentId)`

### Intent Blocks
Every non-trivial function should have a short INTENT comment stating purpose, inputs, and outputs.

### Function Size
Keep functions small and single-responsibility. 700-line controller files are a code smell — prefer splitting by concern.

### Error Handling
- Validate at system boundaries (user input, external APIs)
- Return meaningful HTTP status codes (400 for bad input, 404 for not found, 503 for unavailable services)
- Never silently swallow errors that affect correctness; log them at minimum

## Important Paths
- Backend entry: `backend/src/app.js`, `backend/src/lambda.js`
- Document logic: `backend/src/controllers/documentController.js`
- Agent logic: `backend/src/controllers/agentController.js`
- Agent instructions script: `backend/scripts/update-agent-instructions.js`
- Infrastructure: `infrastructure/lib/legal-dashboard-stack.ts`
- Frontend root: `src/App.vue`, `src/router.js`
- Agent sidebar: `src/components/AgentSidebar.vue`
