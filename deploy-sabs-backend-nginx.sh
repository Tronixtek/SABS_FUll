#!/bin/bash

##
# Deploy Fixed SABS Backend Nginx Configuration
# Adds 15-minute timeouts to the actual active nginx config
##

set -e

echo "=================================================="
echo "  SABS Backend Nginx Timeout Fix"
echo "=================================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backup current config
echo -e "${YELLOW}[1/5] Backing up current configuration...${NC}"
sudo cp /etc/nginx/sites-available/sabs-backend /etc/nginx/sites-available/sabs-backend.backup.$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"
echo ""

# Apply new config
echo -e "${YELLOW}[2/5] Applying new configuration with 15-minute timeouts...${NC}"
sudo cp sabs-backend-nginx.conf /etc/nginx/sites-available/sabs-backend
echo -e "${GREEN}✅ Configuration updated${NC}"
echo ""

# Test config
echo -e "${YELLOW}[3/5] Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Configuration is valid${NC}"
else
    echo -e "${RED}❌ Configuration has errors! Restoring backup...${NC}"
    sudo cp /etc/nginx/sites-available/sabs-backend.backup.$(date +%Y%m%d)* /etc/nginx/sites-available/sabs-backend
    exit 1
fi
echo ""

# Reload nginx
echo -e "${YELLOW}[4/5] Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"
echo ""

# Verify
echo -e "${YELLOW}[5/5] Verifying nginx status...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}=================================================="
echo "  ✅ SABS Backend Timeouts Fixed!"
echo "==================================================${NC}"
echo ""
echo "Changes applied:"
echo "  ✅ Server-level timeouts: 900s (15 minutes)"
echo "  ✅ API proxy timeouts: 900s (15 minutes)"
echo "  ✅ Upload timeouts: 300s (5 minutes)"
echo "  ✅ Fixed deprecated http2 directive"
echo ""
echo "Your device registry fetch should now complete without timeout!"
echo ""
