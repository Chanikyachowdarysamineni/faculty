# Faculty Workload Management - Mobile App (CSE)

A React Native mobile application for the Faculty Workload Management System (WLM) with CSE branding. Built with Expo, React Navigation, and TypeScript.

## Features

### Admin Features
- ✅ Dashboard with system statistics
- 👥 Manage faculty members (view, add, edit, delete)
- 📚 Manage courses
- 📊 View workload distribution
- 📋 Manage course allocations
- ✅ Review faculty submissions
- 👤 User profile and settings

### Faculty Features
- 🏠 Dashboard with quick stats
- 📊 View personal workload
- 📝 Submit workload information
- ✅ View submission history
- 👤 User profile and settings

## 🎨 CSE Branding Setup

This app includes CSE logo and branding. To use the CSE logo:

### Required Logo Files

Place the following CSE logo files in the `assets/` directory:

1. **icon.png** (1024x1024 px) - App icon
2. **splash.png** (1242x2436 px) - Splash screen
3. **adaptive-icon.png** (1024x1024 px) - Android adaptive icon
4. **favicon.png** (192x192 px) - Web favicon
5. **logo.png** (any size) - General use in components

See `assets/LOGO_SETUP.md` for detailed instructions.

### Using the Logo Component

The app includes a reusable `Logo` component that can be imported and used:

```typescript
import { Logo } from '../components';

<Logo size="large" />  // Options: 'small' | 'medium' | 'large'
```

The CSE logo appears automatically on the login screen and can be added to any screen.

## Prerequisites

Before getting started, make sure you have:

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Xcode (for iOS development) or Android Studio (for Android development)

## Installation

### 1. Install Dependencies

```bash
cd mobile
npm install
# or
yarn install
```

### 2. Configure Backend URL

Update the API configuration in `src/constants/apiConfig.ts`:

```typescript
const API_CONFIG = {
  BASE_URL: 'http://YOUR_BACKEND_URL:5000', // Update this
  // ...
};
```

For development on physical device:
```typescript
BASE_URL: 'http://YOUR_MACHINE_IP:5000'
```

### 3. Start the Development Server

```bash
npm start
# or
yarn start
```

This will start the Expo development server and display a QR code.

## Running on Devices/Emulators

### iOS (on macOS)
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web
```bash
npm run web
```

### Physical Device
Scan the QR code from your terminal using:
- **iOS**: Camera app
- **Android**: Expo Go app

## Project Structure

```
mobile/
├── src/
│   ├── context/              # React contexts (Auth, etc)
│   ├── screens/              # Screen components
│   │   ├── auth/
│   │   └── ...
│   ├── services/             # API service classes
│   ├── components/           # Reusable UI components
│   ├── constants/            # Configuration constants
│   └── utils/                # Utility functions
├── assets/                   # App icons, splash screens
├── App.tsx                   # Root app component
├── app.json                  # Expo configuration
├── package.json
├── tsconfig.json
└── babel.config.js
```

## Key Technologies

- **React Native**: Mobile app framework
- **Expo**: Development platform for React Native
- **React Navigation**: Navigation library
  - Bottom Tab Navigator (main navigation)
  - Stack Navigator (modal screens)
  - Drawer Navigator (side menu)
- **TypeScript**: Type-safe JavaScript
- **Axios**: HTTP client for API calls
- **Secure Storage**: For storing authentication tokens
- **AsyncStorage**: For local data persistence

## Authentication

The app uses JWT-based authentication:

1. User enters email & password on login screen
2. Credentials are sent to backend
3. JWT token is stored securely using Expo Secure Store
4. Token is automatically included in all API requests
5. Token refresh is handled automatically on 401 responses

## API Integration

### Service Classes

API interactions are organized into service classes:

- **FacultyService**: Faculty management operations
- **CourseService**: Course management
- **WorkloadService**: Workload information
- **AllocationService**: Course allocations
- **SubmissionService**: Faculty submissions
- **SettingsService**: System settings

Usage example:
```typescript
import { SubmissionService } from '../services';
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { api } = useAuth();
  const submissionService = new SubmissionService(api);
  
  const handleSubmit = async (data) => {
    const response = await submissionService.createSubmission(data);
    // Handle response
  };
};
```

## Development

### Adding New Screens

1. Create a new file in `src/screens/` directory
2. Import the screen in `App.tsx`
3. Add it to appropriate navigator (AdminTabNavigator or FacultyTabNavigator)

Example:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Header } from '../components';

const NewScreen = () => {
  return (
    <View style={styles.container}>
      <Header title="New Screen" />
      {/* Your content */}
    </View>
  );
};

export default NewScreen;
```

### Adding New API Services

1. Create service class in `src/services/index.ts`
2. Add API endpoints to `src/constants/apiConfig.ts`
3. Use the service in your screens

## Styling

The app uses React Native StyleSheet for styling with a consistent color scheme:

- Primary: `#3b82f6` (Blue)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Error: `#ef4444` (Red)
- Text: `#1e293b` (Slate-900)
- Secondary Text: `#64748b` (Slate-500)

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

Requires an Expo account and configured app.json

## Troubleshooting

### Build Errors
- Clear cache: `expo prebuild --clean`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Connection Issues
- Ensure backend server is running
- Check API_CONFIG.BASE_URL matches your server
- Verify network connectivity

### Token Issues
- Clear SecureStore: Uninstall and reinstall the app
- Check token expiration in backend

## Contributing

When contributing to this mobile app:

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Create reusable components
4. Add proper error handling
5. Test on both iOS and Android

## License

Proprietary - Faculty Workload Management System

## Support

For issues and support, contact the development team or refer to the backend documentation.
