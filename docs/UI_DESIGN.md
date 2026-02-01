# UI Design Structure

## Architecture Pattern

The frontend follows the **Composition API + Composables** pattern with centralized state management.

### Directory Structure
```
src/
├── assets/              # Static assets (images, fonts)
├── components/          # Reusable Vue components
│   └── HelloWorld.vue   # Example component
├── composables/         # Reusable composition functions
│   ├── useAuth.js       # Authentication logic (deprecated, moved to store)
│   ├── useClients.js    # Client CRUD operations
│   ├── useFileNumbers.js # File number CRUD operations
│   ├── usePackages.js   # Package CRUD operations
│   └── useWorkflows.js  # Workflow CRUD operations
├── pages/               # Page-level components (route targets)
│   ├── DashboardPage.vue
│   ├── ClientsListPage.vue
│   ├── ClientDetailPage.vue
│   ├── FileNumberDetailPage.vue
│   ├── LoginPage.vue
│   ├── RegisterPage.vue
│   ├── PackageCreatePage.vue
│   ├── PackageDetailPage.vue
│   ├── DemandPackagesPage.vue
│   ├── SettingsPage.vue
│   └── WorkflowPage.vue
├── stores/              # Pinia stores
│   ├── authStore.js     # Authentication state
│   ├── clientStore.js   # Client state (deprecated, use composable)
│   └── packageStore.js  # Package state (deprecated, use composable)
├── utils/               # Utility functions
│   └── api.js           # HTTP client wrapper
├── App.vue              # Root component
├── main.js              # Application entry point
├── router.js            # Vue Router configuration
└── style.css            # Global styles
```

---

## Page Hierarchy

### Authentication Flow
```
Login/Register → Dashboard → (Protected Routes)
```

### Main Navigation Structure
```
Dashboard (/)
├── Client Management (/clients)
│   ├── Client List
│   └── Client Detail (/clients/:clientId)
│       └── File Numbers List
│           └── File Number Detail (/clients/:clientId/file-numbers/:fileNumberId)
│               └── Demand Packages (Coming Soon)
├── Packages (Coming Soon)
├── Workflows (Coming Soon)
└── Settings (Coming Soon)
```

---

## Page Details

### 1. DashboardPage.vue
**Purpose**: Main landing page after authentication

**Features**:
- Welcome banner with gradient background
- Navigation cards:
  - Client Management (active, links to /clients)
  - Packages (coming soon)
  - Workflows (coming soon)
  - Settings (coming soon)
- Logout button

**Layout**:
- Full-screen centered content
- Gradient banner at top
- 2x2 grid of navigation cards

---

### 2. ClientsListPage.vue
**Purpose**: Display and manage all clients for logged-in user

**Features**:
- Search bar (filters by name, email, phone)
- Sort dropdown (name A-Z/Z-A, date newest/oldest)
- "Add Client" button → opens modal
- Client list table with columns:
  - Client Name
  - Contact Information (email, phone)
  - Created Date
  - Actions (View Details, Delete)
- Add/Edit client modal
- Delete confirmation

**Layout**: 
- Table/list view with gradient header
- Responsive grid layout
- Hover effects on rows

**Data Flow**:
- `useClients()` composable for API calls
- `useAuth()` store for logout
- Router navigation to client detail

---

### 3. ClientDetailPage.vue
**Purpose**: Display single client information and associated file numbers

**Features**:
- Client header with name, email, phone
- "New File Number" button → opens modal
- File numbers list table with columns:
  - File Number
  - Description
  - Status (badge with color coding)
  - Created Date
  - Actions (View Details)
- Add file number modal
- Back to Clients link

**Layout**:
- Client info section at top
- File numbers table below (matches clients list styling)

**Data Flow**:
- `useClients()` for client data
- `useFileNumbers()` for file numbers CRUD
- Fetches both on mount

---

### 4. FileNumberDetailPage.vue
**Purpose**: Display file number details and available functions

**Features**:
- File number header with status
- Available functions cards:
  - Demand Packages (clickable)
  - Document Management (coming soon)
- Back to Client link

**Layout**:
- Header section with file number info
- Function cards grid

**Data Flow**:
- `useFileNumbers()` for fetching file number by ID
- Router params: `clientId`, `fileNumberId`

---

### 5. LoginPage.vue / RegisterPage.vue
**Purpose**: User authentication

**Features**:
- Email/password input fields
- Submit button
- Link to toggle between login/register
- Form validation
- Error display

**Data Flow**:
- `authStore.login()` or `authStore.register()`
- Redirects to /dashboard on success
- Stores JWT token in localStorage

---

## Design System

### Color Palette
- **Primary Gradient**: `#667eea` → `#764ba2`
- **Success/Active**: `#28a745` (green)
- **Danger/Delete**: `#dc3545` (red)
- **Closed/Inactive**: `#6c757d` (gray)
- **Background**: `#f5f5f5`
- **Text Primary**: `#333`
- **Text Secondary**: `#666`
- **Border**: `#ddd`, `#f0f0f0`

### Typography
- **Font Family**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Heading Sizes**: 24px (h1), 18-20px (h2), 16px (h3)
- **Body Text**: 14-15px
- **Small Text**: 12-13px

### Components

#### Buttons
- **Primary**: Gradient background, white text, hover lift effect
- **Secondary**: Gray background, white text
- **Delete**: Red background, white text
- **View**: Primary gradient, hover shadow

#### Cards
- White background
- Border radius: 8px
- Box shadow: `0 2px 8px rgba(0, 0, 0, 0.1)`
- Hover effects: lift + stronger shadow

#### Table/List
- Header: Gradient background, white text, 14px font
- Rows: Grid layout, hover background change
- Alternating row borders
- Responsive grid columns

#### Modals
- Overlay: `rgba(0, 0, 0, 0.5)`
- Content: White background, centered, 90% width, max 500px
- Rounded corners, drop shadow

#### Status Badges
- Rounded pill shape (`border-radius: 20px`)
- Uppercase text, 11px font
- Color-coded by status:
  - Active: Green
  - Closed: Gray
  - Custom colors per use case

### Responsive Behavior
- Max width containers: 1200px
- Grid layouts adapt to content
- Mobile considerations (not yet implemented)

---

## State Management

### Composables Pattern
Each entity has a composable that provides:
- Reactive refs: `items`, `currentItem`, `loading`, `error`
- CRUD methods: `fetch*`, `create*`, `update*`, `delete*`
- Returned as object from composable function

Example:
```javascript
const { clients, loading, error, fetchClients, createClient } = useClients()
```

### Auth Store (Pinia)
- `currentUser` - User object
- `token` - JWT token
- `isAuthenticated` - Computed boolean
- `login()`, `register()`, `logout()`
- `initializeAuth()` - Load from localStorage

### API Client
- Centralized HTTP client (`utils/api.js`)
- Automatic token injection in headers
- Error handling and response parsing
- Base URL from environment variable

---

## Router Configuration

### Route Guards
- `beforeEach` hook checks authentication
- Protected routes have `meta: { requiresAuth: true }`
- Redirects:
  - Unauthenticated → `/login`
  - Authenticated on auth pages → `/dashboard`

### Route Definitions
- `/login` - LoginPage
- `/register` - RegisterPage
- `/` - Redirect to `/dashboard`
- `/dashboard` - DashboardPage (protected)
- `/clients` - ClientsListPage (protected)
- `/clients/:clientId` - ClientDetailPage (protected)
- `/clients/:clientId/file-numbers/:fileNumberId` - FileNumberDetailPage (protected)
- `/packages/:packageId` - PackageDetailPage (protected, not implemented)
- `/workflows` - WorkflowPage (protected, not implemented)
- `/settings` - SettingsPage (protected, not implemented)

---

## Future Enhancements

### Planned Features
1. **Document Management**: Upload, view, organize documents per file number
2. **Demand Packages**: Create structured demand letter packages
3. **Workflow Checklists**: Track case progress with custom checklists
4. **Settings Page**: User preferences, notifications, integrations
5. **Search & Filters**: Advanced filtering across all entities
6. **Bulk Operations**: Select multiple items for batch actions
7. **Export/Reports**: Generate PDF reports, export data
8. **Mobile Responsiveness**: Optimize for tablet and phone screens

### Potential UI Improvements
1. Dark mode toggle
2. Customizable dashboard widgets
3. Drag-and-drop file upload
4. Real-time notifications
5. Activity timeline
6. Advanced data tables with sorting/pagination
7. Inline editing capabilities
8. Keyboard shortcuts
