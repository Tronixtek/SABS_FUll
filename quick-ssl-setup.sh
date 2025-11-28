#!/bin/bash
# Quick SSL Setup for SABS Backend
# Domain: sabs-backend.hefrias.ng
# Run this script on your server

set -e  # Exit on any error

echo "🚀 Starting SABS Backend SSL Setup..."
echo "Domain: sabs-backend.hefrias.ng"
echo "Server: $(hostname -I | awk '{print $1}')"
echo ""

# Check if domain resolves to this server
echo "🔍 Checking DNS resolution..."
DOMAIN_IP=$(nslookup sabs-backend.hefrias.ng | grep -A 1 "Name:" | tail -n 1 | awk '{print $2}')
SERVER_IP=$(hostname -I | awk '{print $1}')

if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
    echo "✅ DNS is correct: $DOMAIN_IP"
else
    echo "❌ DNS mismatch: Domain points to $DOMAIN_IP but server is $SERVER_IP"
    echo "Please update your DNS records first!"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update -qq

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "📥 Installing nginx..."
    apt install -y nginx
else
    echo "✅ Nginx already installed"
fi

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📥 Installing certbot..."
    apt install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot already installed"
fi

# Create nginx configuration
echo "⚙️ Creating nginx configuration..."
cat > /etc/nginx/sites-available/sabs-backend << 'EOF'
server {
    listen 80;
    server_name sabs-backend.hefrias.ng;
    
    location / {
        return 200 '{"message": "SABS Backend - SSL Setup in progress..."}';
        add_header Content-Type application/json;
    }
}
EOF

# Enable the site
echo "🔗 Enabling nginx site..."
ln -sf /etc/nginx/sites-available/sabs-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Start/restart nginx
echo "🚀 Starting nginx..."
systemctl enable nginx
systemctl restart nginx

# Get SSL certificate
echo "🔒 Obtaining SSL certificate..."
certbot --nginx -d sabs-backend.hefrias.ng --non-interactive --agree-tos --email admin@hefrias.ng

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained!"
    
    # Update nginx configuration for API proxy
    echo "⚙️ Updating nginx configuration for API..."
    cat > /etc/nginx/sites-available/sabs-backend << 'EOF'
server {
    listen 80;
    server_name sabs-backend.hefrias.ng;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sabs-backend.hefrias.ng;
    
    ssl_certificate /etc/letsencrypt/live/sabs-backend.hefrias.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sabs-backend.hefrias.ng/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Node.js API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization, X-Requested-With' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization, X-Requested-With' always;
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/api/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Root info
    location / {
        return 200 '{"message": "SABS Backend API", "domain": "sabs-backend.hefrias.ng", "endpoints": ["/api/*", "/health"]}';
        add_header Content-Type application/json;
    }
}
EOF

    # Test and reload nginx
    nginx -t && systemctl reload nginx
    
    # Set up auto-renewal
    echo "🔄 Setting up SSL auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
    
    echo ""
    echo "🎉 SSL setup complete!"
    echo "✅ Your secure backend is available at: https://sabs-backend.hefrias.ng"
    echo ""
    echo "🧪 Testing endpoints:"
    curl -s https://sabs-backend.hefrias.ng | jq . || echo "Nginx root endpoint working"
    curl -s https://sabs-backend.hefrias.ng/health || echo "Health endpoint ready (needs Node.js running)"
    
else
    echo "❌ SSL certificate setup failed!"
    echo "Please check:"
    echo "- Domain DNS points to this server"
    echo "- Ports 80 and 443 are open"
    echo "- No other web server is running"
fi

echo ""
echo "📋 Next steps:"
echo "1. Update your Node.js environment variables"
echo "2. Restart your Node.js service"
echo "3. Test API endpoints"
echo "4. Update React frontend with new API URL"