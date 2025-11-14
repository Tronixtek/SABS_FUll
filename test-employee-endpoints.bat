@echo off
echo =====================================
echo XO5 Employee Management API Testing
echo =====================================

echo.
echo 1. Testing Employee LIST endpoint (shows count):
echo POST http://localhost:8081/api/employee/list
curl -X POST http://localhost:8081/api/employee/list -H "Content-Type: application/json" -d "{\"deviceKey\": \"020e7096a03c670f63\", \"secret\": \"123456\"}"

echo.
echo.
echo 2. Testing Employee RECORDS endpoint (shows actual data):
echo POST http://localhost:8081/api/employee/records
curl -X POST http://localhost:8081/api/employee/records -H "Content-Type: application/json" -d "{\"deviceKey\": \"020e7096a03c670f63\", \"secret\": \"123456\", \"pageNum\": 1, \"pageSize\": 100}"

echo.
echo.
echo =====================================
echo API Testing Complete
echo =====================================
pause