# Legal Dashboard

A client-centric web-based application for managing legal cases, clients, and demand packages at a law firm. Organize clients → file numbers (court cases) → demand packages with comprehensive document management.

## Documentation

📚 **Detailed Documentation:**
- [Architecture](docs/ARCHITECTURE.md) - Infrastructure, services, and deployment
- [Data Model](docs/DATA_MODEL.md) - Database schema and relationships
- [UI Design](docs/UI_DESIGN.md) - Component structure and design system

## Project Overview

This application manages the complete lifecycle of legal case management for law firms, supporting multiple file numbers per client (one per court case) and multiple functions within each case.

### Current Implementation
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Client Management**: CRUD operations for clients with user isolation
- **File Numbers**: Court case tracking associated with clients
- **Database**: DynamoDB via LocalStack for local development
- **Storage**: S3 via LocalStack (prepared for document management)
- **API**: RESTful Express.js backend with JWT middleware

### Planned Features
- **Demand Packages**: Create structured demand letter packages
- **Document Management**: Upload and organize case documents
- **Workflow Checklists**: Track case progress with custom checklists
- **Settings**: User preferences and system configuration
- **AWS Migration**: Deploy to production AWS environment
- **SDK Migration**: Upgrade from AWS SDK v2 to v3

## Tech Stack

### Frontend
- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite 7.2.5 (with Rolldown bundler)
- **Router**: Vue Router with authentication guards
- **State Management**: Pinia stores + Composables pattern
- **Styling**: Scoped CSS with custom design system

### Backend
- **Framework**: Node.js with Express.js
- **Authentication**: JWT tokens (7-day expiry)
- **Database**: DynamoDB (AWS SDK v2)
- **Storage**: S3
- **Infrastructure**: AWS CDK with TypeScript

### Development Environment
- **Local AWS**: LocalStack in Docker
- **Database**: DynamoDB tables on LocalStack
- **Storage**: S3 buckets on LocalStack

## Getting Started

### Prerequisites
- Node.js 16+ installed
- Docker Desktop (for LocalStack)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd legal_dashboard
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

3. **Start LocalStack**
```bash
docker-compose up -d
```

4. **Initialize DynamoDB and S3**
```bash
cd backend
node scripts/init-localstack.js
cd ..
```

### Environment Setup

#### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
```

#### Backend `.env`
```env
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

### Running the Application

1. **Start LocalStack** (if not already running)
```bash
docker-compose up -d
```

2. **Start Backend Server**
```bash
cd backend
node src/server.js
# Server runs on http://localhost:5000
```

3. **Start Frontend Dev Server**
```bash
npm run dev
# App runs on http://localhost:5173
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user  
- `GET /api/auth/me` - Get current user

### Clients
- `GET /api/clients` - List all clients for user
- `GET /api/clients/:clientId` - Get client details
- `POST /api/clients` - Create new client
- `PUT /api/clients/:clientId` - Update client
- `DELETE /api/clients/:clientId` - Delete client

### File Numbers
- `GET /api/file-numbers/client/:clientId` - List file numbers for client
- `GET /api/file-numbers/:fileId` - Get file number details
- `POST /api/file-numbers` - Create new file number
- `PUT /api/file-numbers/:fileId` - Update file number
- `DELETE /api/file-numbers/:fileId` - Delete file number

## Development

### Testing LocalStack
```bash
# List DynamoDB tables
aws dynamodb list-tables --endpoint-url=http://localhost:4566

# Scan clients table
aws dynamodb scan --table-name clients --endpoint-url=http://localhost:4566
```

### Known Issues
- AWS SDK v2 is deprecated, migration to v3 needed
- File Numbers table uses Scan instead of GSI for client queries

### Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized JavaScript origins: `http://localhost:5173`
4. Copy Client ID to `.env.local`
5. Add your email to `VITE_ALLOWED_EMAILS`

## Application Features

### 1. Login Page (`/login`)
- Google Sign-In button
- JWT token validation
- Email allowlist verification
- Session persistence via localStorage

### 2. Clients List (`/`) - Main Dashboard
- View all clients in detailed table format
- **Real-time search** by name, email, or phone
- **Sorting options**: Name (A-Z, Z-A), Date (newest/oldest), File count
- Contact information with icons
- File number count badges
- View Details action for each client

### 3. Client Details (`/client/:clientId`)
- File numbers for selected client
- Each file number shows court case info
- Add new file number modal
- Status badges for file numbers
- Navigate to file number functions

### 4. File Number Details (`/client/:clientId/file/:fileNumberId`)
- Available functions as cards
- **Demand Packages**: Click to manage packages
- **Document Management**: Coming soon (disabled)
- Computed count of demand packages
- Back navigation to client

### 5. Demand Packages (`/client/:clientId/file/:fileNumberId/packages`)
- List all packages for file number
- Package cards with status badges
- Create new package button (opens inline modal)
- Quick links to package details and checklist
- Empty state message

### 6. Package Creation (`/package/create` or contextual route)
- Package name *required
- Description (optional)
- Recipient *required
- Auto-linked to client and file number context
- Success/error messaging

### 7. Package Details (`/package/:id`)
- Complete package information
- Status indicators
- Document count by category
- Action buttons: Manage Checklist, Delete
- Document category overview
- Proper back navigation

### 8. Document Checklist (`/package/:id/workflow`)
- Three document categories:
  - **Medical Records** (required) - must have ≥1
  - **Accident Reports** (optional)
  - **Photographs** (optional)
- Add/remove documents per category
- Status selection (in-progress, completed)
- Save and return functionality
- Real-time validation

### 9. Settings (`/settings`)
- Manage email allowlist
- Add/remove authorized users
- localStorage-based persistence

## Project Structure

```
src/
├── pages/                           # Vue pages/components
│   ├── LoginPage.vue                # Google OAuth login
│   ├── ClientsListPage.vue          # Client list with search/filter
│   ├── ClientDetailPage.vue         # File numbers for a client
│   ├── FileNumberDetailPage.vue     # Available functions for a case
│   ├── DemandPackagesPage.vue       # Demand packages list for a file number
│   ├── PackageCreatePage.vue        # Create new demand package
│   ├── PackageDetailPage.vue        # Package details view
│   ├── WorkflowPage.vue             # Document checklist
│   └── SettingsPage.vue             # Email allowlist management
├── stores/                          # State management (composables)
│   ├── authStore.js                 # Google OAuth authentication
│   ├── clientStore.js               # Clients and file numbers
│   └── packageStore.js              # Demand packages and documents
├── App.vue                          # Root component
├── router.js                        # Vue Router configuration
├── main.js                          # App entry point
└── style.css                        # Global styles


## Key Features

### Authentication
- Google OAuth 2.0 with JWT decoding
- Email allowlist for authorized users
- Session persistence using localStorage
- Protected routes (requires authentication)

### Client Management
- Organize clients hierarchically
- Track multiple file numbers per client (one per court case)
- View file number details with status information

### Demand Packages
- Create demand packages within file numbers
- Track package status (draft, in-progress, completed)
- Manage document categories:
  - Medical Records (required)
  - Accident Reports (optional)
  - Photographs (optional)

### Document Checklist
- Document-based workflow system
- Add/remove documents by category
- Real-time validation
- Status tracking

### Search & Filter
- Real-time client search by name, email, or phone
- Sort clients by name, date, or file count
- Detailed list view with contact information

## Navigation Hierarchy

```
/ (Login) → Clients List
  └── Client Detail
      └── File Number Detail
          └── Demand Packages
              └── Package Detail → Document Checklist
```

## Future Enhancements

### AWS Integration
- Replace mock authentication with AWS Cognito
- Use AWS S3 for document storage
- Implement AWS Lambda for backend processing

### Document Management
- Upload and manage documents
- Document versioning
- Document preview and editing

### Additional Functions
- Document Management (within file numbers)
- Motion Management
- Settlement Tracking

### AI Integration
- Smart document suggestions
- Automated workflow recommendations
- AI-powered package optimization

## Troubleshooting

### Dev Server Not Starting
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install
npm run dev
```

### Hot Module Replacement (HMR) Issues
- Vite should handle HMR automatically
- If not working, refresh the browser manually

### Authentication Issues
- Check browser localStorage for `currentUser` key
- Clear cache and reload if needed

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Configuration

### Vite Configuration
See `vite.config.js` for Vite-specific settings.

### Future AWS Configuration
AWS configuration will be added in the next phase. Settings will be stored in:
- Environment variables
- `.env` files
- AWS configuration files

## Support and Contribution

For issues or feature requests, please create an issue in the repository.

## License

This project is part of the Demand Developer initiative for law firm package management.
