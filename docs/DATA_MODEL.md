# Data Model

## Database: DynamoDB

All tables use single-table design pattern with partition keys. Global Secondary Indexes (GSI) are used for querying by non-primary keys.

---

## Tables

### 1. Users Table
**Purpose**: Store user authentication and profile information

**Primary Key**: 
- Partition Key: `email` (String)

**Attributes**:
- `userId` (String, UUID) - Unique user identifier
- `email` (String) - User email address (PK)
- `name` (String) - Full name
- `password` (String) - Bcrypt hashed password
- `createdAt` (String, ISO 8601) - Account creation timestamp
- `updatedAt` (String, ISO 8601) - Last update timestamp

**Access Patterns**:
- Login by email
- Get user profile by email

---

### 2. Clients Table
**Purpose**: Store client information with user association

**Primary Key**:
- Partition Key: `clientId` (String, UUID)

**Global Secondary Indexes**:
- **userIdIndex**: Partition Key = `userId`
  - Used to fetch all clients for a specific user

**Attributes**:
- `clientId` (String, UUID) - Unique client identifier (PK)
- `userId` (String, UUID) - Owner user ID
- `name` (String) - Client name
- `email` (String, optional) - Client email
- `phone` (String, optional) - Client phone
- `address` (String, optional) - Client address
- `createdAt` (String, ISO 8601) - Creation timestamp
- `updatedAt` (String, ISO 8601) - Last update timestamp

**Access Patterns**:
- Get client by clientId
- Get all clients for a user (via userIdIndex)
- Update client information
- Delete client

---

### 3. File Numbers Table
**Purpose**: Store court case file numbers associated with clients or packages

**Primary Key**:
- Partition Key: `fileId` (String, UUID)

**Attributes**:
- `fileId` (String, UUID) - Unique file number identifier (PK)
- `packageId` (String, UUID, nullable) - Associated package ID
- `clientId` (String, UUID, nullable) - Associated client ID
- `fileNumber` (String) - The actual file number (e.g., "CV-2024-001234")
- `description` (String, optional) - Case description
- `status` (String) - Case status: "active" | "closed"
- `createdAt` (String, ISO 8601) - Creation timestamp
- `updatedAt` (String, ISO 8601) - Last update timestamp

**Notes**:
- Either `packageId` or `clientId` must be present
- Currently using DynamoDB Scan to filter by clientId (consider adding GSI for better performance)

**Access Patterns**:
- Get file number by fileId
- Get all file numbers for a client (scan by clientId)
- Get all file numbers for a package (query by packageIdIndex)

---

### 4. Packages Table
**Purpose**: Store demand package information

**Primary Key**:
- Partition Key: `packageId` (String, UUID)

**Attributes**:
- `packageId` (String, UUID) - Unique package identifier (PK)
- `clientId` (String, UUID) - Associated client ID
- `name` (String) - Package name
- `description` (String, optional) - Package description
- `status` (String) - Package status
- `createdAt` (String, ISO 8601) - Creation timestamp
- `updatedAt` (String, ISO 8601) - Last update timestamp

**Access Patterns**:
- Get package by packageId
- Get all packages for a client
- Update package
- Delete package

---

### 5. Workflows Table
**Purpose**: Store workflow/checklist items for packages

**Primary Key**:
- Partition Key: `workflowId` (String, UUID)

**Attributes**:
- `workflowId` (String, UUID) - Unique workflow identifier (PK)
- `packageId` (String, UUID) - Associated package ID
- `name` (String) - Workflow item name
- `description` (String, optional) - Item description
- `completed` (Boolean) - Completion status
- `order` (Number) - Display order
- `createdAt` (String, ISO 8601) - Creation timestamp
- `updatedAt` (String, ISO 8601) - Last update timestamp

**Access Patterns**:
- Get workflow by workflowId
- Get all workflows for a package
- Update workflow status
- Delete workflow

---

## Relationships

```
User (1) ──────< (N) Client
             │
             │
Client (1) ──┼──< (N) FileNumber
             │
             └──< (N) Package
                      │
                      └──< (N) Workflow

FileNumber (N) ───< (1) Package (optional)
```

## Storage: S3

### Bucket: legal-documents-dev
**Purpose**: Store document files associated with cases

**Structure** (planned):
```
/documents/
  /{clientId}/
    /{fileNumberId}/
      /{documentId}/
        - file.pdf
        - metadata.json
```

**Metadata** (planned):
- Document type
- Upload timestamp
- Uploader userId
- File size
- MIME type

---

## Future Enhancements

### Potential GSI Additions
1. **File Numbers Table**: Add `clientIdIndex` GSI for efficient client-based queries (currently using Scan)
2. **Packages Table**: Add `clientIdIndex` GSI
3. **Workflows Table**: Add `packageIdIndex` GSI

### Potential New Tables
1. **Documents**: Track document metadata separately from S3
2. **Activities/Audit Log**: Track user actions for compliance
3. **Templates**: Store document templates
4. **Settings**: User preferences and system configuration
