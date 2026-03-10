# SABS Mobile App Setup Guide

## Overview
The SABS (Staff Attendance Biometric System) web application has been converted to a mobile app using Capacitor, allowing it to run natively on Android and iOS devices.

## What Was Installed

### Core Dependencies
- `@capacitor/core` - Capacitor core library
- `@capacitor/cli` - Capacitor command-line tools
- `@capacitor/android` - Android platform support
- `@capacitor/ios` - iOS platform support

### Capacitor Plugins
- `@capacitor/app` - App state and lifecycle management
- `@capacitor/camera` - Camera access for taking photos
- `@capacitor/keyboard` - Keyboard behavior control
- `@capacitor/network` - Network connectivity status
- `@capacitor/splash-screen` - Splash screen management
- `@capacitor/status-bar` - Status bar styling and control

## Project Structure
```
client/
├── android/           - Native Android project
├── ios/               - Native iOS project (requires Mac to build)
├── build/             - React production build (web assets)
├── capacitor.config.ts - Capacitor configuration
└── package.json       - With new mobile scripts
```

## Configuration

### App Details
- **App Name**: SABS Attendance
- **App ID**: com.sabs.attendance  
- **Web Directory**: build
- **Splash Screen Color**: #1976d2 (blue)

### Capacitor Config
Located in `client/capacitor.config.ts`:
- Configured for production build directory
- Splash screen settings
- Plugin configurations

## Development Workflow

### 1. Build the Web App
```bash
cd client
npm run build
```

### 2. Sync Web Assets to Native Projects
After any code changes, sync the build to native projects:
```bash
npm run cap:sync
# or sync individual platforms:
npm run cap:sync:android
npm run cap:sync:ios
```

### 3. Run on Android

#### Prerequisites
- Android Studio installed
- Android SDK configured
- Android device/emulator

#### Commands
```bash
# Open Android Studio to run/build the app
npm run cap:open:android

# Or run directly on connected device
npm run cap:run:android
```

#### First Time Setup in Android Studio
1. Open the `android` folder in Android Studio
2. Let Gradle sync complete
3. Connect Android device or start emulator
4. Click Run ▶️ button or press Shift+F10

### 4. Run on iOS

#### Prerequisites
- **Mac computer required** (iOS development only works on macOS)
- Xcode installed
- iOS device or simulator

#### Commands
```bash
# Open Xcode to run/build the app
npm run cap:open:ios

# Or run directly on connected device
npm run cap:run:ios
```

## Quick Build and Sync

Use the convenience script to build and sync in one command:
```bash
npm run build:mobile
```

This will:
1. Build the React app (`npm run build`)
2. Copy web assets to native projects (`npx cap sync`)

## Testing the Mobile App

### Android Testing
1. Build the web app: `npm run build`
2. Sync to Android: `npm run cap:sync:android`
3. Open Android Studio: `npm run cap:open:android`
4. Select device/emulator and click Run

### iOS Testing (Requires Mac)
1. Build the web app: `npm run build`
2. Sync to iOS: `npm run cap:sync:ios`
3. Open Xcode: `npm run cap:open:ios`
4. Select simulator/device and click Run

## Building Release APK/AAB (Android)

### In Android Studio:
1. Open `android` folder in Android Studio
2. Go to **Build > Generate Signed Bundle / APK**
3. Select **APK** or **Android App Bundle (AAB)**
4. Create or use existing keystore
5. Build release version

### Via Gradle Command Line:
```bash
cd android
./gradlew assembleRelease  # For APK
./gradlew bundleRelease    # For AAB (Google Play)
```

Release files will be in:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Building Release IPA (iOS)

**Requires Mac and Apple Developer Account**

1. Open `ios/App/App.xcworkspace` in Xcode (NOT the .xcodeproj)
2. Select signing team (Apple Developer Account)
3. Product > Archive
4. Distribute to App Store or TestFlight

## API Configuration

### Important: Update API URL for Production
The mobile app needs to connect to your live server. Update the API base URL in your React app:

**Location**: `client/src/api/axios.js` or similar

```javascript
// Development (local server)
const API_URL = 'http://localhost:5000';

// Production (live server)
const API_URL = 'https://your-server.com';
```

For mobile apps, use the **production server URL** in the build.

## Permissions Required

### Android Permissions
Located in `android/app/src/main/AndroidManifest.xml`:
- Internet access
- Camera (if using biometric camera features)
- Network state
- Storage (for caching)

### iOS Permissions
Located in `ios/App/App/Info.plist`:
- Camera usage description
- Photo library usage description
- Network access

## Live Reload for Development

### Android Live Reload
1. Make sure your computer and Android device are on the same network
2. Find your computer's local IP address
3. Update `capacitor.config.ts`:

```typescript
server: {
  url: 'http://192.168.1.XXX:3000',  // Your computer's IP
  cleartext: true
}
```

4. Run `npx cap sync android`
5. Start React dev server: `npm start`
6. Run app from Android Studio

The app will now load from your dev server with hot-reload!

## Common Commands Reference

```bash
# Build web app
npm run build

# Sync all platforms
npm run cap:sync

# Sync specific platform
npm run cap:sync:android
npm run cap:sync:ios

# Open in native IDE
npm run cap:open:android
npm run cap:open:ios

# Run on device
npm run cap:run:android
npm run cap:run:ios

# Build and sync in one command
npm run build:mobile

# Update Capacitor
npx cap update

# List installed plugins
npx cap ls

# Check Capacitor doctor
npx cap doctor
```

## File Sizes

### Typical APK Size
- Development: 10-20 MB
- Release (optimized): 5-10 MB

### Optimization Tips
- Enable ProGuard in Android build
- Use AAB format for Play Store (optimized per-device downloads)
- Optimize images and assets
- Enable code splitting in React

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew build
```

### Plugins Not Working
```bash
# Sync again
npx cap sync

# Check plugin status
npx cap ls
```

### White Screen on App Launch
- Ensure `npm run build` was run
- Check `webDir: 'build'` in capacitor.config.ts
- Verify build folder exists and has files
- Run `npx cap sync` again

### API Connection Issues
- Update API URL to production server
- Check CORS settings on server
- Verify server is accessible from mobile network
- Check AndroidManifest.xml has internet permission

## Next Steps

1. **Test the App**: 
   - Run `npm run build:mobile`
   - Open Android Studio: `npm run cap:open:android`
   - Test on emulator/device

2. **Customize Icons**: 
   - Add app icons in `android/app/src/main/res/` folders
   - Add iOS icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

3. **Update API URL**: 
   - Point to production server instead of localhost

4. **Add Permissions**: 
   - Update AndroidManifest.xml for needed permissions
   - Update Info.plist for iOS permissions

5. **Build Release**: 
   - Generate signed APK/AAB for distribution
   - Upload to Google Play Store (Android)
   - Archive and upload to App Store (iOS)

## Distribution

### Android
- **Google Play Store**: Upload AAB file
- **Direct Distribution**: Share APK file
- **Beta Testing**: Use Google Play Console Beta track

### iOS
- **App Store**: Requires Apple Developer Account ($99/year)
- **TestFlight**: Beta testing platform
- **Ad Hoc**: Limited device distribution

## Support

For Capacitor documentation: https://capacitorjs.com/docs
For issues: Check `npx cap doctor` output
