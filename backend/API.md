# Legal Dashboard API Documentation

Base URL: `http://localhost:5000/api`

All requests except authentication endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Authentication Endpoints

### Register
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "John Doe"
  }
  ```
- **Response:**
  ```json
  {
    "token": "eyJhbGc...",
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
  ```

### Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response:**
  ```json
  {
    "token": "eyJhbGc...",
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
  ```

---

## Clients Endpoints

### Create Client
- **POST** `/clients`
- **Body:**
  ```json
  {
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "phone": "555-0100",
    "address": "123 Main St",
    "status": "active"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "clientId": "uuid",
    "userId": "uuid",
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "phone": "555-0100",
    "address": "123 Main St",
    "status": "active",
    "createdAt": "2026-02-01T00:00:00.000Z",
    "updatedAt": "2026-02-01T00:00:00.000Z"
  }
  ```

### Get All Clients
- **GET** `/clients`
- **Response:** 200 OK
  ```json
  [
    { /* client object */ },
    { /* client object */ }
  ]
  ```

### Get Client by ID
- **GET** `/clients/{clientId}`
- **Response:** 200 OK
  ```json
  { /* client object */ }
  ```

### Update Client
- **PUT** `/clients/{clientId}`
- **Body:** (all fields optional)
  ```json
  {
    "name": "Updated Name",
    "status": "inactive"
  }
  ```
- **Response:** 200 OK
  ```json
  { /* updated client object */ }
  ```

### Delete Client
- **DELETE** `/clients/{clientId}`
- **Response:** 204 No Content

---

## Packages Endpoints

### Create Package
- **POST** `/packages`
- **Body:**
  ```json
  {
    "clientId": "uuid",
    "name": "Contract Review",
    "description": "Review and negotiate contract",
    "type": "general",
    "status": "open"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "packageId": "uuid",
    "clientId": "uuid",
    "name": "Contract Review",
    "description": "Review and negotiate contract",
    "type": "general",
    "status": "open",
    "createdAt": "2026-02-01T00:00:00.000Z",
    "updatedAt": "2026-02-01T00:00:00.000Z"
  }
  ```

### Get Packages by Client
- **GET** `/packages/client/{clientId}`
- **Response:** 200 OK
  ```json
  [
    { /* package object */ },
    { /* package object */ }
  ]
  ```

### Get Package by ID
- **GET** `/packages/{packageId}`
- **Response:** 200 OK
  ```json
  { /* package object */ }
  ```

### Update Package
- **PUT** `/packages/{packageId}`
- **Body:** (all fields optional)
  ```json
  {
    "status": "closed",
    "description": "Updated description"
  }
  ```
- **Response:** 200 OK
  ```json
  { /* updated package object */ }
  ```

### Delete Package
- **DELETE** `/packages/{packageId}`
- **Response:** 204 No Content

---

## File Numbers Endpoints

### Create File Number
- **POST** `/file-numbers`
- **Body:**
  ```json
  {
    "packageId": "uuid",
    "fileNumber": "FILE-2026-001",
    "description": "Main case file",
    "status": "active"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "fileId": "uuid",
    "packageId": "uuid",
    "fileNumber": "FILE-2026-001",
    "description": "Main case file",
    "status": "active",
    "createdAt": "2026-02-01T00:00:00.000Z",
    "updatedAt": "2026-02-01T00:00:00.000Z"
  }
  ```

### Get File Numbers by Package
- **GET** `/file-numbers/package/{packageId}`
- **Response:** 200 OK
  ```json
  [
    { /* file number object */ },
    { /* file number object */ }
  ]
  ```

### Get File Number by ID
- **GET** `/file-numbers/{fileId}`
- **Response:** 200 OK
  ```json
  { /* file number object */ }
  ```

### Update File Number
- **PUT** `/file-numbers/{fileId}`
- **Body:** (all fields optional)
  ```json
  {
    "status": "archived",
    "fileNumber": "FILE-2026-001-A"
  }
  ```
- **Response:** 200 OK
  ```json
  { /* updated file number object */ }
  ```

### Delete File Number
- **DELETE** `/file-numbers/{fileId}`
- **Response:** 204 No Content

---

## Workflows Endpoints

### Create Workflow
- **POST** `/workflows`
- **Body:**
  ```json
  {
    "packageId": "uuid",
    "name": "Contract Negotiation",
    "description": "Steps for negotiating contract",
    "status": "draft",
    "steps": [
      { "name": "Initial Review", "status": "pending" },
      { "name": "Revisions", "status": "pending" },
      { "name": "Final Approval", "status": "pending" }
    ],
    "currentStep": 0
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "workflowId": "uuid",
    "packageId": "uuid",
    "name": "Contract Negotiation",
    "description": "Steps for negotiating contract",
    "status": "draft",
    "steps": [ /* array of steps */ ],
    "currentStep": 0,
    "createdAt": "2026-02-01T00:00:00.000Z",
    "updatedAt": "2026-02-01T00:00:00.000Z"
  }
  ```

### Get Workflows by Package
- **GET** `/workflows/package/{packageId}`
- **Response:** 200 OK
  ```json
  [
    { /* workflow object */ },
    { /* workflow object */ }
  ]
  ```

### Get Workflow by ID
- **GET** `/workflows/{workflowId}`
- **Response:** 200 OK
  ```json
  { /* workflow object */ }
  ```

### Update Workflow
- **PUT** `/workflows/{workflowId}`
- **Body:** (all fields optional)
  ```json
  {
    "status": "active",
    "currentStep": 1
  }
  ```
- **Response:** 200 OK
  ```json
  { /* updated workflow object */ }
  ```

### Delete Workflow
- **DELETE** `/workflows/{workflowId}`
- **Response:** 204 No Content

---

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error description"
}
```

Common HTTP Status Codes:
- **400** - Bad Request (missing required fields)
- **401** - Unauthorized (invalid or missing token)
- **404** - Not Found (resource doesn't exist)
- **500** - Internal Server Error

---

## Example Workflow

1. **Register/Login** to get JWT token
2. **Create Client**
3. **Create Package** for that client
4. **Create File Numbers** for the package
5. **Create Workflows** to track progress
6. **Update** any entity as needed
7. **Delete** when completed

---

## Testing with cURL

Register:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Create Client (with token):
```bash
curl -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Client",
    "email": "client@example.com"
  }'
```
