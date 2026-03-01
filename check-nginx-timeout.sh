#!/bin/bash

echo "🔍 Checking for Nginx configuration..."

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "✅ Nginx is not installed - no reverse proxy timeout issues"
    exit 0
fi

echo "⚠️  Nginx is installed. Checking timeout configurations..."

# Common nginx config locations
CONFIG_LOCATIONS=(
    "/etc/nginx/nginx.conf"
    "/etc/nginx/sites-enabled/default"
    "/etc/nginx/sites-available/default"
    "/etc/nginx/conf.d/*.conf"
)

echo ""
echo "Current timeout settings:"
for location in "${CONFIG_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        echo "📄 $location"
        grep -i "timeout" "$location" | grep -v "#" || echo "  No timeout directives found"
        echo ""
    fi
done

echo "════════════════════════════════════════════"
echo "Recommended Nginx timeout settings:"
echo "════════════════════════════════════════════"
echo ""
echo "Add these to your nginx server block:"
echo ""
echo "    proxy_read_timeout 900s;"
echo "    proxy_connect_timeout 900s;"
echo "    proxy_send_timeout 900s;"
echo "    client_body_timeout 900s;"
echo "    send_timeout 900s;"
echo ""
echo "Example location block:"
echo ""
echo "    location /api/ {"
echo "        proxy_pass http://localhost:5000;"
echo "        proxy_read_timeout 900s;"
echo "        proxy_connect_timeout 900s;"
echo "        proxy_send_timeout 900s;"
echo "    }"
echo ""
echo "After updating, reload nginx:"
echo "    sudo nginx -t"
echo "    sudo systemctl reload nginx"
echo ""
