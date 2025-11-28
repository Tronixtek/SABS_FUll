# SABS Client - Smart Attendance Biometric System

## Overview
This is the React frontend for the SABS (Smart Attendance Biometric System). It provides a modern web interface for managing employee attendance, biometric data, analytics, and reporting.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Backend API server running on `http://143.198.150.26:5000`

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd SABS-client

# Install dependencies
npm install

# Start development server
npm start
```

### Production Build
```bash
# Create production build
npm run build

# The build folder will contain optimized static files for deployment
```

## 🔧 Configuration

### Environment Variables
The application uses environment variables for configuration:

**Production (`.env.production`):**
- `REACT_APP_API_URL=http://143.198.150.26:5000` - Backend API server
- `REACT_APP_JAVA_API_URL=http://143.198.150.26:8081` - Java service API

**Development (`.env.development`):**
- `REACT_APP_API_URL=http://localhost:5000` - Local backend
- `REACT_APP_JAVA_API_URL=http://localhost:8081` - Local Java service

## 📁 Project Structure
```
src/
├── components/          # Reusable React components
├── pages/              # Main application pages
├── context/            # React context providers
├── config/             # Configuration files
├── App.js              # Main application component
└── index.js            # Application entry point

public/
├── index.html          # HTML template
├── manifest.json       # PWA manifest
└── robots.txt          # SEO robots file
```

## 🌟 Features
- **Dashboard**: Real-time attendance overview and analytics
- **Employee Management**: Add, edit, and manage employee profiles
- **Attendance Tracking**: View and manage attendance records
- **Biometric Integration**: XO5 device integration for face recognition
- **Facilities Management**: Manage multiple office locations
- **Reports**: Generate PDF reports and analytics
- **Settings**: System configuration and user management

## 🔌 API Integration
The frontend communicates with:
1. **Node.js Backend** (`143.198.150.26:5000`) - Main API server
2. **Java Service** (`143.198.150.26:8081`) - Biometric device integration

## 📊 Technology Stack
- **React** - Frontend framework
- **Axios** - HTTP client
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Heroicons** - Icons
- **Recharts** - Charts and analytics
- **React Hot Toast** - Notifications

## 🚀 Deployment

### Option 1: Static Hosting (Recommended)
```bash
# Build for production
npm run build

# Deploy the build/ folder to any static hosting service:
# - Netlify
# - Vercel
# - Firebase Hosting
# - AWS S3 + CloudFront
```

### Option 2: Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

### Option 3: Manual Server Setup
```bash
# Install serve globally
npm install -g serve

# Build and serve
npm run build
serve -s build -l 3000
```

## 🔐 Security Considerations
- Environment variables are properly configured
- No sensitive data in client-side code
- CORS configured for backend communication
- Production builds are optimized and minified

## 📝 Scripts
- `npm start` - Start development server
- `npm run build` - Create production build
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (not recommended)

## 🌐 Backend Dependencies
Ensure the following services are running:
- **Node.js Backend**: `143.198.150.26:5000`
- **Java Service**: `143.198.150.26:8081`
- **MongoDB Database**: Connected to backend
- **XO5 Biometric Devices**: Connected to Java service

## 🔧 Development Setup
1. Make sure backend services are running
2. Update `.env.development` with correct API URLs
3. Start development server: `npm start`
4. Access application at `http://localhost:3000`

## 📞 Support
For deployment issues or configuration help, check:
1. Environment variables are correctly set
2. Backend services are accessible
3. Network connectivity to `143.198.150.26`
4. CORS settings allow your deployment domain

## 🎯 Production Checklist
- ✅ Environment variables configured
- ✅ Backend API accessible at `143.198.150.26:5000`
- ✅ Java service accessible at `143.198.150.26:8081`
- ✅ Build process completes without errors
- ✅ Static files optimized for production
- ✅ CORS configured on backend for deployment domain