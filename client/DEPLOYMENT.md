# SABS Deployment Guide

## Frontend Deployment (Separate Server)

### 🎯 Deployment Architecture
```
Frontend Server (Your Choice)  →  Backend Server 
                                │
                                ├── Node.js API (Port 5000)
                                └── Java Service (Port 8081)
```

### 📋 Pre-Deployment Checklist
- ✅ Backend services running on `143.198.150.26`
- ✅ Environment variables configured
- ✅ React app builds successfully
- ✅ API endpoints tested and accessible
- ✅ CORS configured on backend

### 🚀 Quick Deployment Options

#### Option 1: Netlify (Recommended for simplicity)
1. Build the project:
   ```bash
   npm run build
   ```

2. Drag & drop the `build` folder to Netlify, or:
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy
   netlify deploy --prod --dir=build
   ```

#### Option 2: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option 3: Traditional VPS/Server
```bash
# On your server
sudo apt update
sudo apt install nginx nodejs npm

# Clone and build
git clone <your-repo>
cd SABS-client
npm install
npm run build

# Configure Nginx
sudo nano /etc/nginx/sites-available/sabs-frontend

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/SABS-client/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Optional: Proxy API calls (if needed)
    location /api/ {
        proxy_pass http://143.198.150.26:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/sabs-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 🚨 **CRITICAL: Mixed Content Security Issue**

**⚠️ IMPORTANT**: If your frontend is on HTTPS (secure domain) but backend uses HTTP, browsers will **BLOCK all API calls** due to Mixed Content security policy.

#### The Problem:
- ✅ HTTP frontend → HTTP backend = Works
- ✅ HTTPS frontend → HTTPS backend = Works  
- ❌ **HTTPS frontend → HTTP backend = BLOCKED** ← Your situation

#### Solution 1: Enable HTTPS on Backend (RECOMMENDED)
```bash
# On your backend server (143.198.150.26)
# You need a domain name pointing to your server first
# Example: api.yourdomain.com → 143.198.150.26

# Install SSL certificate
sudo apt update
sudo apt install certbot nginx
sudo certbot --nginx -d api.yourdomain.com

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/sabs-api
```

**Nginx Configuration for HTTPS Backend:**
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Proxy to Node.js API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Proxy to Java service
    location /java/ {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Then update your environment:**
```bash
# .env.production
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_JAVA_API_URL=https://api.yourdomain.com/java
```

#### Solution 2: Frontend Proxy (Quick Fix)
If you can't get HTTPS on backend immediately, proxy through your frontend:

```nginx
server {
    listen 443 ssl;
    server_name your-frontend-domain.com;
    
    # Frontend React app
    root /path/to/build;
    index index.html;
    
    # Proxy API calls to avoid Mixed Content
    location /api/ {
        proxy_pass http://143.198.150.26:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Handle CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization';
        
        # Handle preflight OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization';
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 200;
        }
    }
    
    # React app routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Update environment for proxy:**
```bash
# .env.production (API calls will go through your frontend domain)
REACT_APP_API_URL=/api  # Relative path, will use same domain
```

#### Solution 3: Development Workaround (Not for production)
For testing only, you can disable Mixed Content in browser:
```bash
# Chrome (dangerous, testing only!)
chrome --disable-web-security --user-data-dir=/tmp/chrome_dev_session
```

### 🔧 Environment Configuration

**Current Configuration (will cause Mixed Content errors):**
```bash
REACT_APP_API_URL=http://143.198.150.26:5000  # HTTP won't work from HTTPS
```

**Fixed Configuration (choose one):**
```bash
# Option 1: HTTPS backend
REACT_APP_API_URL=https://api.yourdomain.com/api

# Option 2: Frontend proxy
REACT_APP_API_URL=/api

# Option 3: Keep HTTP backend (frontend must also be HTTP)
REACT_APP_API_URL=http://143.198.150.26:5000
```

### 🌐 CORS Configuration Required
Add your frontend domain to the backend CORS configuration:

**Node.js backend** (`server/config/cors.js`):
```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-frontend-domain.com',  // Add this
    'http://143.198.150.26:3000'
  ],
  credentials: true
};
```

### 📊 Testing Deployment
1. **Health Check**: Visit your deployed URL
2. **API Connection**: Check browser console for API errors
3. **Authentication**: Test login functionality
4. **Device Integration**: Verify biometric device connectivity

### 🔍 Troubleshooting

#### Common Issues:
1. **CORS Errors**: Update backend CORS settings
2. **API Not Found**: Check environment variables
3. **Blank Page**: Check build errors and console logs
4. **Slow Loading**: Optimize build size

#### Debug Commands:
```bash
# Check environment in production
console.log(process.env.REACT_APP_API_URL)

# Test API connectivity
curl http://143.198.150.26:5000/api/health

# Check build size
npm run build
du -sh build/
```

### 📈 Performance Optimization
- Static files are automatically optimized
- Enable gzip compression on your server
- Consider CDN for faster global access
- Monitor with tools like Lighthouse

### 🔐 Security Notes
- Always use HTTPS in production
- Environment variables don't contain secrets
- API keys (if any) should be backend-only
- Configure CSP headers if needed

### 📞 Support
Backend server: `143.198.150.26:5000`
Java service: `143.198.150.26:8081`

For deployment issues, check:
1. Backend services are accessible
2. Network connectivity from your server
3. Environment variables are correct
4. CORS is properly configured