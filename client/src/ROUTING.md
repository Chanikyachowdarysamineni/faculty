# React Router v6 Implementation - Faculty Workload Management

## Overview
A centralized, scalable routing system using React Router v6 with global route definitions, protected routes, and authentication context.

## File Structure

### 1. **routes.jsx** (Route Configuration)
Centralized route definitions with wrappers for passing context to components.

**Key Routes:**
```
Public Routes:
  /login - LoginPage
  / - Redirect to /login

Protected Routes (Require Authentication):
  /csefaculty - Dashboard (main entry point)
  /csefaculty/dashboard - Dashboard
  /csefaculty/faculty - Faculty Management ✓ DIRECT URL ACCESS
  /csefaculty/courses - Courses Management
  /csefaculty/workload - Workload Management
  /csefaculty/my-workload - My Workload
  /csefaculty/allocations - Allocations
  /csefaculty/sections - Section Management
  /csefaculty/profile - User Profile
  /csefaculty/submissions - My Submissions
  /csefaculty/extra-faculty - Extra Faculty
  /csefaculty/audit-logs - Audit Logs
```

**Wrappers:**
- `LoginPageWrapper` - Injects `onLogin` from AuthContext, redirects if already logged in
- `DashboardWrapper` - Injects `user`, `onLogout`, `remainingSeconds` from AuthContext
- All other components can access auth context via `useAuth()` hook

### 2. **AuthContext.jsx** (Authentication State Management)
Provides centralized authentication state and callbacks.

**Exposed Values:**
```javascript
{
  currentUser,      // Current logged-in user or null
  onLogout,         // Logout function
  onLogin,          // Login function
  remainingSeconds, // Session timeout countdown
  resetSessionTimeout, // Reset session counter
  isAuthenticated   // Boolean: user logged in status
}
```

**Usage in Components:**
```javascript
import { useAuth } from './AuthContext';

function MyComponent() {
  const { currentUser, onLogout, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <div>Welcome, {currentUser.name}</div>;
}
```

### 3. **ProtectedRoute.jsx** (Route Protection)
Wrapper component that checks authentication before rendering protected routes.

**Features:**
- Redirects unauthenticated users to `/login`
- Used for all `/csefaculty/*` routes
- Throws error if used outside AuthProvider

```jsx
// In routes.jsx
<ProtectedRoute>
  <FacultyPage />
</ProtectedRoute>
```

### 4. **App.js** (Root Component)
Main application wrapper with:
- BrowserRouter (enables React Router)
- AuthProvider (supplies auth context)
- Session management and timeout logic
- Error boundaries and data providers

**Component Hierarchy:**
```
<Router> (BrowserRouter)
  └─ <ErrorBoundary>
     └─ <DataProvider> (shared data: faculty, courses, allocations)
        └─ <AuthProvider> (auth: user, login/logout, session)
           └─ <ToastProvider> (notifications)
              └─ <LoadingProvider> (loading states)
                 └─ <AppContent> (route rendering)
```

## Implementation Details

### Direct URL Access
Faculty page is now accessible directly via URL:
```
http://localhost:3000/csefaculty/faculty
```

This works because:
1. Routes are defined in `routes.jsx` with path `/csefaculty/faculty`
2. App.js wraps all routes with BrowserRouter
3. Navigation doesn't require internal state swaps

### Global State Management
All routes have access to:
- **User Authentication** - via `useAuth()` hook
- **Shared Application Data** - via `useSharedData()` hook (faculty, courses, allocations)
- **Session Management** - via `useAuth()` for timeout tracking

### Session Management
- **Timeout Duration:** 30 minutes of inactivity
- **Warning Threshold:** 2 minutes before timeout
- **Reset Trigger:** Any user activity (mouse, keyboard, scroll, touch)
- **Auto-logout:** When countdown reaches zero

### Error Handling
- Unauthenticated users trying to access `/csefaculty/*` are redirected to `/login`
- Invalid routes redirect to `/csefaculty` (authenticated) or `/login` (unauthenticated)
- 404 pages can be added with wildcard route

## Usage Examples

### Navigate to Faculty Page
```javascript
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  
  return (
    <button onClick={() => navigate('/csefaculty/faculty')}>
      Go to Faculty
    </button>
  );
}
```

### Check Authentication in Component
```javascript
import { useAuth } from './AuthContext';

function UserMenu() {
  const { isAuthenticated, currentUser, onLogout } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return (
    <div>
      <p>User: {currentUser.name}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}
```

### Access Shared Data
```javascript
import { useSharedData } from './DataContext';

function FacultyList() {
  const { faculty } = useSharedData();
  
  return (
    <ul>
      {faculty.map(f => <li key={f.id}>{f.name}</li>)}
    </ul>
  );
}
```

## Adding New Routes

### Step 1: Create Component
```jsx
// NewPage.jsx
function NewPage() {
  const { currentUser } = useAuth();
  return <div>New Page for {currentUser.name}</div>;
}
```

### Step 2: Add to routes.jsx
```javascript
import NewPage from './NewPage';

// In protectedRoutes array:
{
  path: '/csefaculty/new-page',
  element: <ProtectedRoute><NewPage /></ProtectedRoute>,
  title: 'New Page Title'
}
```

### Step 3: Add Navigation Link
```jsx
import { Link } from 'react-router-dom';

<Link to="/csefaculty/new-page">New Page</Link>
```

## Testing Routes

### Test Direct URL Access
1. Open browser to: `http://localhost:3000/csefaculty/faculty`
2. If logged in → Faculty page renders ✓
3. If not logged in → Redirected to `/login` ✓

### Test Route Protection
1. Open browser to: `http://localhost:3000/csefaculty/courses`
2. Without login token → Redirected to `/login` ✓
3. After login → Courses page renders ✓

### Test Fallback Routes
1. Invalid route: `http://localhost:3000/invalid`
2. If authenticated → Redirected to `/csefaculty` ✓
3. If not authenticated → Redirected to `/login` ✓

## Key Features

✅ **Centralized Routes** - All routes in one file for easy management  
✅ **Protected Routes** - Automatic redirect for unauthenticated users  
✅ **Direct URL Access** - Faculty page (and others) accessible via direct URL  
✅ **Context-Based Auth** - No prop drilling required  
✅ **Session Management** - Timeout warning and auto-logout  
✅ **Scalable Structure** - Easy to add new routes and pages  
✅ **Type Safe** - Documentation and error messages for hook usage  
✅ **Performance** - Efficient route matching and rendering  

## Backend Route Compatibility

All routes use `/csefaculty` prefix matching backend:
- ✓ Frontend: `/csefaculty/*`
- ✓ Backend: `/csefaculty/*`
- ✓ Consistent namespace across application

## Troubleshooting

**Issue:** Routes not rendering  
**Solution:** Ensure component is wrapped in `<ProtectedRoute>` and BrowserRouter is at app root

**Issue:** useAuth() throws error  
**Solution:** Ensure component is rendered within BrowserRouter and AuthProvider

**Issue:** onLogin not working  
**Solution:** Check that handleLogin in App.js: 
  1. Saves token to localStorage
  2. Sets currentUser state
  3. Updates AuthProvider value

**Issue:** Session timeout not working  
**Solution:** Verify that activity event listeners are attached and countdown interval is running
