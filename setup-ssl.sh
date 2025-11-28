#!/bin/bash
# SSL Setup Script for SABS Backend
# Domain: sabs-backend.hefrias.ng
# Server: 143.198.150.26

echo "🔒 Setting up SSL for SABS Backend Domain: sabs-backend.hefrias.ng"

# Update system
sudo apt update
sudo apt upgrade -y

# Install nginx
sudo apt install nginx -y

# Install certbot for Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx -y

# Create nginx configuration for SABS backend
sudo tee /etc/nginx/sites-available/sabs-backend << 'EOF'
server {
    listen 80;
    server_name sabs-backend.hefrias.ng;
    
    # Redirect HTTP to HTTPS (will be added after SSL setup)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sabs-backend.hefrias.ng;
    
    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/sabs-backend.hefrias.ng/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/sabs-backend.hefrias.ng/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Node.js API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header Access-Control-Expose-Headers 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header Access-Control-Max-Age 1728000 always;
            add_header Content-Type 'text/plain; charset=utf-8' always;
            add_header Content-Length 0 always;
            return 204;
        }
    }
    
    # Java Service proxy (optional)
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/api/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Root endpoint info
    location / {
        return 200 '{"message": "SABS Backend API", "version": "1.0.0", "domain": "sabs-backend.hefrias.ng", "endpoints": ["/api/*", "/health"], "note": "Frontend communicates only with Node.js API"}';
        add_header Content-Type application/json;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/sabs-backend /etc/nginx/sites-enabled/

# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Start nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    echo "🔒 Obtaining SSL certificate for sabs-backend.hefrias.ng"
    
    # Get SSL certificate
    sudo certbot --nginx -d sabs-backend.hefrias.ng --non-interactive --agree-tos --email admin@hefrias.ng
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate obtained successfully!"
        
        # Set up auto-renewal
        sudo crontab -l | grep -q certbot || (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sudo crontab -
        
        echo "🔄 SSL auto-renewal configured"
        
        # Restart nginx to apply SSL
        sudo systemctl restart nginx
        
        echo "🎉 HTTPS setup complete!"
        echo "Your backend is now available at: https://sabs-backend.hefrias.ng"
        echo ""
        echo "Testing endpoints:"
        echo "curl https://sabs-backend.hefrias.ng/health"
        echo "curl https://sabs-backend.hefrias.ng/api/health"
        
    else
        echo "❌ Failed to obtain SSL certificate"
        echo "Make sure sabs-backend.hefrias.ng points to this server (143.198.150.26)"
    fi
    
else
    echo "❌ Nginx configuration test failed"
fi

echo ""
echo "📝 Next steps:"
echo "1. Update your React frontend environment:"
echo "   REACT_APP_API_URL=https://sabs-backend.hefrias.ng/api"
echo ""
echo "2. Update CORS in your Node.js app to allow your frontend domain"
echo ""
echo "3. Test your API endpoints"