#!/bin/bash
# Check if deployed code matches local code
echo "=== Checking deployed code on server ==="
ssh root@143.198.150.26 "cd /root/SABS_FUll && git log --oneline -1 && echo '' && grep -A 5 'Calculate attendance percentages and correct absent days' server/controllers/reportController.js | head -10"
