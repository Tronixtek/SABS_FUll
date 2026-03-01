#!/bin/bash

echo "🔧 Auto-fixing Nginx timeout configuration..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root: sudo bash auto-fix-nginx-timeout.sh"
    exit 1
fi

CONFIG_FILE="/etc/nginx/sites-available/default"
BACKUP_FILE="/etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    exit 1
fi

# Backup the config
echo "📦 Creating backup: $BACKUP_FILE"
cp "$CONFIG_FILE" "$BACKUP_FILE"

echo "✅ Backup created"
echo ""

# Check if timeouts already exist
if grep -q "proxy_read_timeout" "$CONFIG_FILE"; then
    echo "⚠️  Timeout directives already exist. Checking values..."
    grep "timeout" "$CONFIG_FILE" | grep -v "#"
    echo ""
    echo "You may need to manually edit: $CONFIG_FILE"
    echo "Backup is available at: $BACKUP_FILE"
    exit 0
fi

echo "📝 Adding timeout directives to nginx config..."

# Add timeout directives after proxy_pass line in location /api/ block
sed -i '/location \/api\//,/}/{ 
    /proxy_pass/ a\
\        \n\        # Extended timeouts for device operations (15 minutes)\
\        proxy_read_timeout 900s;\
\        proxy_connect_timeout 900s;\
\        proxy_send_timeout 900s;\
\        client_body_timeout 900s;\
\        client_header_timeout 900s;
}' "$CONFIG_FILE"

echo "✅ Configuration updated"
echo ""

# Test the configuration
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuration test passed!"
    echo ""
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx reloaded successfully!"
        echo ""
        echo "📊 New configuration:"
        grep -A 10 "location /api/" "$CONFIG_FILE" | grep -E "proxy_|timeout"
    else
        echo "❌ Failed to reload nginx"
        echo "Restoring backup..."
        cp "$BACKUP_FILE" "$CONFIG_FILE"
        exit 1
    fi
else
    echo ""
    echo "❌ Configuration test failed!"
    echo "Restoring backup..."
    cp "$BACKUP_FILE" "$CONFIG_FILE"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Nginx timeout configuration complete!"
echo "Backup saved at: $BACKUP_FILE"
echo "════════════════════════════════════════════════════"
