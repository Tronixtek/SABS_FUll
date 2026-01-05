#!/bin/bash

# Test Create Facility API
# This script tests the Node.js backend create facility endpoint

SERVER_URL="http://localhost:5000"  # Change if testing remote server

echo "================================="
echo "Test Create Facility API"
echo "================================="
echo ""

# Step 1: Login (if authentication is required)
echo "Step 1: Login to get authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$TOKEN" ]; then
    echo "✅ Login successful! Token obtained."
    AUTH_HEADER="Authorization: Bearer $TOKEN"
else
    echo "⚠️  Login failed or not required. Proceeding without token..."
    AUTH_HEADER=""
fi
echo ""

# Step 2: Create Facility
echo "Step 2: Creating new facility..."
echo ""

curl -X POST "$SERVER_URL/api/facilities" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Test Facility XO5",
    "code": "TEST-XO5-001",
    "address": {
      "street": "123 Test Street",
      "city": "Lagos",
      "state": "Lagos State",
      "zipCode": "100001",
      "country": "Nigeria"
    },
    "location": {
      "address": "123 Test Street",
      "city": "Lagos",
      "state": "Lagos State",
      "zipCode": "100001",
      "country": "Nigeria"
    },
    "contactInfo": {
      "phone": "+234-123-456-7890",
      "email": "facility@example.com",
      "manager": "John Doe"
    },
    "contactPerson": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+234-123-456-7890"
    },
    "deviceApiUrl": "http://143.198.150.26:8081",
    "deviceApiKey": "020e7096a03c670f63",
    "timezone": "Africa/Lagos",
    "status": "active",
    "deviceInfo": {
      "deviceId": "XO5-DEVICE-001",
      "deviceModel": "XO5 Biometric"
    },
    "configuration": {
      "autoSync": true,
      "syncInterval": 5,
      "maxRetries": 3
    }
  }' | jq '.'

echo ""
echo "================================="
echo "Test Complete"
echo "================================="
