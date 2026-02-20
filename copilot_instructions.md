# Copilot Instructions - Legal Dashboard

## Current Application State (Feb 16, 2026)

### Production Environment
- **CloudFront URL**: https://d1a0t4zzh748tj.cloudfront.net
- **API Gateway URL**: https://ozzx2wkqy1.execute-api.us-east-1.amazonaws.com/prod/
- **AWS Region**: us-east-1
- **AWS Account**: 315326805073
- **Admin User**: af_sting@yahoo.com (approved)

### Deployment Commands
```bash
# Deploy backend + frontend
cd infrastructure
npm run deploy:staging -- -FrontendOrigin https://d1a0t4zzh748tj.cloudfront.net

# Build frontend only
cd legal_dashboard
npm run build

# Deploy frontend only (after build)
cd infrastructure
npm run deploy:staging -- -FrontendOrigin https://d1a0t4zzh748tj.cloudfront.net
```

## Recently Completed Features

### 1. Document Management System (COMPLETED ✅)
**Implementation Date**: Feb 15-16, 2026
**Location**: File Number Detail page → Document Management card

**Features**:
- ✅ Modal UI with drag-and-drop file upload
- ✅ Multi-file upload support (sequential with 100ms delay)
- ✅ S3 presigned URL uploads (bypasses API Gateway 10MB limit)
- ✅ Document versioning (same filename creates new S3 version)
- ✅ Version history viewing (expand/collapse per document)
- ✅ Soft delete (metadata marked deleted, S3 versions preserved)
- ✅ Folder filtering (prevents folders from being uploaded)
- ✅ Supports files up to 5GB

**Technical Implementation**:
- **Backend**: `backend/src/controllers/uploadController.js` - Presigned URL generation
- **Backend**: `backend/src/controllers/documentController.js` - Legacy multipart upload
- **Backend**: `backend/src/models/Document.js` - Document metadata model
- **Frontend**: `src/pages/FileNumberDetailPage.vue` - Document modal UI
- **Frontend**: `src/composables/useDocuments.js` - Upload logic with presigned URLs
- **Routes**: 
  - `POST /file-numbers/:fileId/documents/presigned-url` - Get upload URL
  - `POST /file-numbers/:fileId/documents/confirm` - Confirm upload
  - `GET /file-numbers/:fileId/documents` - List documents
  - `GET /file-numbers/:fileId/documents/:documentId/versions` - List versions
  - `DELETE /file-numbers/:fileId/documents/:documentId` - Soft delete

**S3 Upload Flow**:
1. Frontend requests presigned URL from backend
2. File uploads directly to S3 (no API Gateway, no Lambda)
3. Frontend confirms upload to backend
4. Backend creates document metadata in DynamoDB

**S3 Key Format**: `clients/{clientId}/file-numbers/{fileNumber}/docs/{filename}`

**DynamoDB Schema**:
- **Table**: documents
- **Partition Key**: fileId (String)
- **Sort Key**: documentId (String)
- **Attributes**: fileName, contentType, size, s3Key, latestVersionId, uploadedBy, createdAt, deletedAt, deletedBy

### 2. Client Management (CORRECTED ✅)
**Issue Fixed**: Clients were user-scoped, but should be firm-wide
**Date**: Feb 15, 2026

**Changes**:
- Changed `Client.getByUserId()` to `Client.getAll()` with table scan
- Renamed field `userId` to `createdBy` (tracks who created client)
- All users at firm can now see all clients
- Backend: `backend/src/models/Client.js`
- Backend: `backend/src/controllers/clientController.js`

### 3. File Number Bug Fix (RESOLVED ✅)
**Issue**: "ValidationException: Type mismatch for Index Key packageId Expected: S Actual: NULL"
**Date**: Feb 15, 2026

**Root Cause**: DynamoDB GSI keys cannot be NULL; must omit attribute entirely

**Fix**: 
- Modified `FileNumber.create()` to conditionally add packageId/clientId only when truthy
- Modified `FileNumber.update()` to strip null/undefined values before update
- Location: `backend/src/models/FileNumber.js`

### 4. CloudFront Hosting (DEPLOYED ✅)
**Date**: Feb 15, 2026

**Infrastructure**:
- S3 bucket for frontend hosting: `legaldashboardstack-frontendbucketefe2e19c-sssgwuyd9wvi`
- CloudFront distribution serves frontend with SPA routing (403/404 → /index.html)
- CDK automatic deployment with S3 bucket deployment
- Location: `infrastructure/lib/legal-dashboard-stack.ts`

## Active Issues & Considerations

### Multi-File Upload Improvements
- Currently uploads sequentially with 100ms delay
- Consider parallel uploads with Promise.all() for better performance
- Error handling is per-file (one failure doesn't stop others)

### Download Functionality (NOT IMPLEMENTED)
- No download endpoint yet
- Will need signed URL endpoint for downloads: `GET /file-numbers/:fileId/documents/:documentId/download`
- Will need to handle specific version downloads

### S3 Versioning
- Enabled on documents bucket
- Same filename upload creates new version
- latestVersionId tracked in DynamoDB
- All versions preserved even after soft delete

## Important Code Locations

### Backend Structure
```
backend/src/
├── controllers/
│   ├── documentController.js    # Legacy multipart upload
│   ├── uploadController.js      # Presigned URL generation (NEW)
│   ├── clientController.js      # Firm-wide client list
│   └── fileNumberController.js  # File number CRUD
├── models/
│   ├── Document.js              # Document metadata & versioning
│   ├── Client.js                # Firm-wide client model
│   └── FileNumber.js            # Fixed NULL GSI issue
└── routes/
    └── fileNumbers.js           # Document routes under file numbers
```

### Frontend Structure
```
src/
├── pages/
│   └── FileNumberDetailPage.vue  # Document modal UI
├── composables/
│   ├── useDocuments.js           # Document upload with presigned URLs
│   ├── useClients.js             # Firm-wide client fetching
│   └── useFileNumbers.js         # File number operations
└── utils/
    └── api.js                    # API client with FormData support
```

### Infrastructure
```
infrastructure/lib/
└── legal-dashboard-stack.ts      # CDK stack with S3, Lambda, API Gateway, CloudFront
```

## DynamoDB Tables

### users
- **Partition Key**: email (String)
- **Attributes**: userId, name, role, isAdmin, approvalStatus, createdAt

### clients
- **Partition Key**: clientId (String)
- **GSI**: userIdIndex (for legacy queries, not actively used)
- **Attributes**: name, email, phone, address, createdBy, createdAt

### file-numbers
- **Partition Key**: fileId (String)
- **GSI**: packageIdIndex (packageId) - NOTE: Key must not be NULL
- **GSI**: clientIdIndex (clientId) - NOTE: Key must not be NULL
- **Attributes**: fileNumber, description, status, clientId, packageId (optional)

### documents
- **Partition Key**: fileId (String)
- **Sort Key**: documentId (String)
- **Attributes**: fileName, contentType, size, s3Key, latestVersionId, uploadedBy, createdAt, deletedAt, deletedBy

### packages
- **Partition Key**: packageId (String)
- **GSI**: clientIdIndex (clientId)

### workflows
- **Partition Key**: workflowId (String)
- **GSI**: packageIdIndex (packageId)

## Environment Variables

### Backend (.env - Production)
```env
# Set by CDK automatically:
NODE_ENV=production
CORS_ORIGIN=https://d1a0t4zzh748tj.cloudfront.net
JWT_EXPIRY=7d
DYNAMODB_TABLE_USERS=users
DYNAMODB_TABLE_CLIENTS=clients
DYNAMODB_TABLE_PACKAGES=packages
DYNAMODB_TABLE_FILE_NUMBERS=file-numbers
DYNAMODB_TABLE_WORKFLOWS=workflows
DYNAMODB_TABLE_DOCUMENTS=documents
S3_BUCKET_DOCUMENTS=legal-documents-315326805073-us-east-1
JWT_SECRET_ARN=arn:aws:secretsmanager:...
```

### Frontend (.env.production)
```env
VITE_API_URL=https://ozzx2wkqy1.execute-api.us-east-1.amazonaws.com/prod/
```

## AWS Resources

### S3 Buckets
- **Documents**: legal-documents-315326805073-us-east-1 (versioned)
- **Frontend**: legaldashboardstack-frontendbucketefe2e19c-sssgwuyd9wvi

### Lambda Functions
- **BackendFunction**: Node.js 18.x, 512MB memory, 30s timeout
- **Environment**: All DynamoDB table names, S3 bucket names, JWT secret ARN

### API Gateway
- **Type**: LambdaRestApi with proxy integration
- **Binary Media Types**: multipart/form-data (for legacy upload)
- **CORS**: Enabled for CloudFront origin

### CloudFront
- **Distribution**: d1a0t4zzh748tj.cloudfront.net
- **Origin**: S3 static website
- **Error Responses**: 403/404 → /index.html (for SPA routing)

## Known Technical Debt

1. **AWS SDK v2 → v3 Migration**: Backend still uses SDK v2 (deprecated)
2. **Download Functionality**: Not yet implemented
3. **Progress Indicators**: File uploads don't show byte-level progress
4. **Parallel Uploads**: Currently sequential, could be parallel
5. **S3 Bucket Policy**: May need fine-tuning for production security
6. **CloudFront Cache Invalidation**: Manual after deployments

## Testing Checklist

When making changes, test:
- [ ] Login with af_sting@yahoo.com
- [ ] Create/view/edit clients (should see all firm clients)
- [ ] Create file numbers WITHOUT packageId (should not error)
- [ ] Upload single document (should work up to 5GB)
- [ ] Upload multiple documents (should upload all successfully)
- [ ] View document versions (expand to see history)
- [ ] Soft delete document (should hide from list but preserve in S3)
- [ ] Drop folder into upload (should show warning and filter out)

## Next Steps / Future Work

### Immediate Priorities
1. Implement download functionality with signed URLs
2. Add progress indicators for large file uploads
3. Consider parallel uploads for multiple files

### Future Enhancements
1. Document preview/thumbnails
2. Document search and filtering
3. Bulk operations (delete multiple, move documents)
4. Document sharing/permissions
5. Activity log for document changes
6. Email notifications for document uploads

## Debugging Tips

### Backend Logs
```bash
aws logs tail /aws/lambda/LegalDashboardStack-BackendFunction --follow --region us-east-1
```

### DynamoDB Queries
```bash
# List all clients
aws dynamodb scan --table-name clients --region us-east-1

# Check documents for a file
aws dynamodb query --table-name documents \
  --key-condition-expression "fileId = :fid" \
  --expression-attribute-values '{":fid":{"S":"<fileId>"}}' \
  --region us-east-1
```

### S3 Operations
```bash
# List documents
aws s3 ls s3://legal-documents-315326805073-us-east-1/clients/ --recursive --region us-east-1

# Check versioning
aws s3api list-object-versions --bucket legal-documents-315326805073-us-east-1 \
  --prefix clients/<clientId>/file-numbers/<fileNumber>/docs/ --region us-east-1
```

### Frontend Debugging
- Check browser console for API errors
- Check Network tab for failed requests
- Verify JWT token in localStorage
- Check CloudFront cache (may need to wait or invalidate)

## Common Error Patterns

### "Failed to fetch"
- **Cause**: File too large (if using old endpoint) OR CORS issue OR network error
- **Solution**: Ensure using presigned URL endpoint, check CORS headers

### "ValidationException: Type mismatch for Index Key"
- **Cause**: Trying to write NULL to GSI key attribute
- **Solution**: Omit the attribute entirely instead of setting to null

### "Access Denied" on S3
- **Cause**: Lambda IAM role doesn't have S3 permissions
- **Solution**: Check CDK grants: `documentsBucket.grantReadWrite(backendFunction)`

### 403/404 on CloudFront
- **Cause**: SPA routing not configured OR file not deployed
- **Solution**: Check error response rules map to /index.html, redeploy frontend

## Contact & Support

**Admin User**: af_sting@yahoo.com
**AWS Account**: 315326805073
**Region**: us-east-1

For major changes, test locally with LocalStack first, then deploy to staging (production).
