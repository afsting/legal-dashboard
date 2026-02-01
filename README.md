# Penny Page Demand Development Application

A client-centric web-based application for managing demand packages at a law firm. Organize clients → file numbers (court cases) → demand packages with comprehensive document checklists.

## Project Overview

This application manages the complete lifecycle of demand packages for law firm clients, supporting multiple file numbers per client (one per court case) and multiple functions within each case.

### Current Implementation (Phase 2 - Complete)
- **Authentication**: Google OAuth 2.0 with JWT decoding
- **Client Management**: Hierarchical organization (Client → File Numbers → Functions)
- **Demand Packages**: Create and manage within file number context
- **Document Checklist**: Categorized documents (Medical Records, Accident Reports, Photographs)
- **Search & Filter**: Real-time client search with sorting options
- **Settings**: Email allowlist management

### Planned Features (Phase 3)
- **Document Management Function**: Upload and organize case documents
- **Motion Management**: Track and manage motions
- **Settlement Tracking**: Monitor settlement progress
- **AWS Integration**: S3 storage, Lambda backend
- **AI Assistance**: Smart document suggestions and workflow automation

## Tech Stack

- **Frontend**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite 7.2.5 (with Rolldown experimental bundler)
- **Router**: Vue Router (dynamic imports, protected routes)
- **Authentication**: Google OAuth 2.0 with custom JWT validation
- **State Management**: Vue composables (composable-based stores)
- **Styling**: Custom CSS (no external framework)
- **Deployment**: AWS (future)

## Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn
- Google OAuth credentials configured

### Installation

```bash
npm install
```

### Environment Setup

Create `.env.local` with:
```
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_ALLOWED_EMAILS=user@example.com
```

### Development

```bash
npm run dev
```

Available at `http://localhost:5173/`

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
