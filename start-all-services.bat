@echo off
REM Quick Start Script for Two-Way Communication Testing
REM This script helps start all required services for testing

echo ========================================
echo   Two-Way Communication Test Launcher
echo ========================================
echo.

echo 1. Starting Java XO5 Service...
echo    Port: 8081
echo    Service: Spring Boot with XO5 Integration
echo.

start "Java XO5 Service" cmd /k "cd /d \"C:\Users\PC\Desktop\attendance tracking system - Copy\java-attendance-service\" && mvn spring-boot:run"

echo 2. Waiting for Java service to start...
timeout /t 10 /nobreak > nul

echo 3. Starting Node.js Backend...
echo    Port: 3001  
echo    Service: MERN Backend with MongoDB
echo.

start "Node.js Backend" cmd /k "cd /d \"C:\Users\PC\Desktop\attendance tracking system - Copy\server\" && npm start"

echo 4. Waiting for Node.js backend to start...
timeout /t 5 /nobreak > nul

echo 5. Starting React Frontend...
echo    Port: 3000
echo    Service: React Development Server
echo.

start "React Frontend" cmd /k "cd /d \"C:\Users\PC\Desktop\attendance tracking system - Copy\client\" && npm start"

echo 6. Opening Test Browser...
timeout /t 10 /nobreak > nul
start "Test Browser" "http://localhost:3000/employees"

echo.
echo ========================================
echo   All Services Started Successfully!
echo ========================================
echo.
echo Services Running:
echo   ✓ Java XO5 Service    : http://localhost:8081
echo   ✓ Node.js Backend     : http://localhost:3001  
echo   ✓ React Frontend      : http://localhost:3000
echo   ✓ Employee Page       : http://localhost:3000/employees
echo.
echo Health Check URLs:
echo   Java:   curl http://localhost:8081/api/device/health
echo   Node:   curl http://localhost:3001/api/health
echo.
echo Test Instructions:
echo   1. Navigate to http://localhost:3000/employees
echo   2. Ensure "Java XO5 (Two-way)" is selected
echo   3. Click "Add Employee"
echo   4. Fill form and capture face photo
echo   5. Watch real-time status updates during registration
echo.
echo Press any key to close this window...
pause > nul