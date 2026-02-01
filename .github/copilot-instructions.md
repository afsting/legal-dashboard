<!-- Persistent instructions for continuing work on Demand Developer -->

## Project Summary
**Name**: Penny Page Demand Development Application
**Goal**: Client-centric workflow and package editor for managing demand packages at law firms
**Architecture**: Client → File Numbers (court cases) → Functions (Demand Packages, Document Management)
**Status**: Phase 2 complete (core architecture and UI finished)

## Tech Stack
- **Frontend**: Vue 3 (Composition API, `<script setup>`, dynamic imports)
- **Build**: Vite 7.2.5 with Rolldown (experimental)
- **Router**: Vue Router with protected routes
- **Auth**: Google OAuth 2.0 with JWT validation
- **State**: Composable-based stores (authStore, clientStore, packageStore)
- **Styling**: Custom CSS (no frameworks)
- **Deployment**: AWS (future)

## Current Architecture

### Store Structure
```
authStore.js
├── currentUser (email, authenticated status)
├── loginWithGoogle(credentials)
├── logout()
└── isAuthenticated (reactive)

clientStore.js
├── clients (array of {id, name, email, phone, fileNumbers})
├── addClient(data)
├── addFileNumber(clientId, data)
├── getFileNumberById(clientId, fileNumberId)
└── getClientById(clientId)

packageStore.js
├── packages (array linked to clientId, fileNumberId)
├── addPackage(clientId, fileNumberId, data) → creates with status='draft'
├── getPackagesByFileNumber(clientId, fileNumberId)
├── getPackageById(id)
├── updatePackageStatus(id, status)
├── addDocument(packageId, category, name)
├── removeDocument(packageId, category, index)
└── deletePackage(id)
```

### Route Structure
```
/login                                          → LoginPage (Google OAuth)
/                                               → ClientsListPage (search/filter)
/client/:clientId                               → ClientDetailPage (file numbers)
/client/:clientId/file/:fileNumberId            → FileNumberDetailPage (functions)
/client/:clientId/file/:fileNumberId/packages   → DemandPackagesPage (package list)
/client/:clientId/file/:fileNumberId/packages/create → PackageCreatePage (contextual)
/package/create                                 → PackageCreatePage (standalone)
/package/:id                                    → PackageDetailPage
/package/:id/workflow                           → WorkflowPage (checklist)
/settings                                       → SettingsPage (email allowlist)
```

### Key Data Models
```
Client: {id, name, email, phone, fileNumbers: [], createdAt}
FileNumber: {id, number, description, court, createdAt}
Package: {id, name, description, recipient, clientId, fileNumberId, status, documents, createdAt}
Documents: {medicalRecords: [], accidentReports: [], photographs: []}
```

## Current Pages (All Complete)
- LoginPage.vue - Google Sign-In button
- ClientsListPage.vue - Detailed list with search/filter
- ClientDetailPage.vue - File number management with modal
- FileNumberDetailPage.vue - Function selection cards
- DemandPackagesPage.vue - Package list + inline create modal
- PackageCreatePage.vue - Form supporting contextual params
- PackageDetailPage.vue - Package overview with navigation
- WorkflowPage.vue - Document checklist (3 categories, medical records required)
- SettingsPage.vue - Email allowlist management

## Implementation Details

### Search & Filter (ClientsListPage)
- Real-time search across name, email, phone
- Sort by: name (asc/desc), date (newest/oldest), file count (most/least)
- Detailed table layout with contact icons

### Document Checklist
- Medical Records: Required (validation enforced)
- Accident Reports: Optional
- Photographs: Optional
- Add/remove per category
- Status tracking: draft, in-progress, completed

### Navigation Patterns
- All pages have proper back buttons
- Breadcrumb-style navigation through hierarchy
- Modal-based forms for inline creation
- Route params preserve context (clientId, fileNumberId)

## Environment Variables (.env.local)
```
VITE_GOOGLE_CLIENT_ID=838312409122-qtg66a94m2j6na3gfakcvmg0cla69n3g.apps.googleusercontent.com
VITE_ALLOWED_EMAILS=usafsting@gmail.com
```

## Development Server
- Running: `npm run dev`
- URL: `http://localhost:5173/`
- HMR: Enabled via Vite
- No external build issues

## Next Phase (Phase 3 - Planned)
1. **Document Management Function**: File upload/organization within file numbers
2. **Motion Management**: Separate function for tracking motions
3. **Settlement Tracking**: Case settlement monitoring
4. **AWS Integration**: S3 document storage, Lambda backend
5. **AI Features**: Smart suggestions and automation

## Known Limitations & Future Work
- DashboardPage.vue exists but router points to ClientsListPage
- Document Management shows "Coming Soon" (not yet implemented)
- Google OAuth origin must be registered in Google Console
- No document file uploads yet (text-based checklist only)
- No backend API integration (localStorage only)

## Code Standards
- Vue 3 Composition API with `<script setup>`
- Reactive refs and computed properties
- Dynamic route imports for code splitting
- Proper error handling and validation
- Semantic HTML with accessibility
- Custom CSS with gradient themes
- localStorage for persistence

## Important Notes for Next Session
- Always run from: `C:\Users\af_st\git\demand_developer`
- Dev server: `npm run dev` (background task available)
- All stores use reactive refs and computed properties
- Package status values: 'draft', 'in-progress', 'completed'
- File numbers tied to clients; packages tied to file numbers
- Search/filter only on ClientsListPage - other pages use direct navigation
- Modals use v-if with overlay pattern
