package com.hfims.xcan.gateway.tcp.demo.web;

import com.hfims.xcan.gateway.tcp.demo.service.MernBackendService;
import com.hfims.xcan.gateway.tcp.demo.support.BaseResult;
import com.hfims.xcan.gateway.tcp.demo.support.ResultWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/integration")
@CrossOrigin(origins = "*")
@Slf4j
public class IntegrationController extends BaseController {

    @Autowired
    private MernBackendService mernBackendService;

    /**
     * Test connectivity between Java service and MERN backend
     */
    @GetMapping("/test")
    public BaseResult testIntegration() {
        log.info("=== TESTING JAVA-MERN INTEGRATION ===");
        
        try {
            // Test MERN backend connectivity
            boolean connected = mernBackendService.testConnection();
            
            Map<String, Object> result = new HashMap<>();
            result.put("javaServiceStatus", "running");
            result.put("javaServicePort", 8081);
            result.put("mernBackendConnected", connected);
            result.put("timestamp", System.currentTimeMillis());
            
            if (connected) {
                log.info("✅ Integration test successful - MERN backend is reachable");
                return ResultWrapper.wrapSuccess(result);
            } else {
                log.warn("⚠️ Integration test partial - MERN backend not reachable");
                return ResultWrapper.wrapFailure("1001", "MERN backend not reachable", result);
            }
            
        } catch (Exception e) {
            log.error("❌ Integration test failed: {}", e.getMessage());
            return ResultWrapper.wrapFailure("1000", "Integration test failed: " + e.getMessage());
        }
    }

    /**
     * Test employee sync endpoint
     */
    @PostMapping("/test/employee")
    public BaseResult testEmployeeSync(@RequestBody Map<String, Object> employeeData) {
        log.info("=== TESTING EMPLOYEE SYNC ===");
        
        try {
            boolean success = mernBackendService.syncEmployee(employeeData);
            
            Map<String, Object> result = new HashMap<>();
            result.put("syncSuccess", success);
            result.put("employeeData", employeeData);
            result.put("timestamp", System.currentTimeMillis());
            
            if (success) {
                return ResultWrapper.wrapSuccess(result);
            } else {
                return ResultWrapper.wrapFailure("2001", "Employee sync test failed", result);
            }
            
        } catch (Exception e) {
            log.error("Employee sync test failed: {}", e.getMessage());
            return ResultWrapper.wrapFailure("2000", "Employee sync test error: " + e.getMessage());
        }
    }

    /**
     * Test attendance record sending
     */
    @PostMapping("/test/attendance")
    public BaseResult testAttendanceSync(@RequestBody Map<String, Object> attendanceData) {
        log.info("=== TESTING ATTENDANCE SYNC ===");
        
        try {
            boolean success = mernBackendService.sendAttendanceRecord(attendanceData);
            
            Map<String, Object> result = new HashMap<>();
            result.put("syncSuccess", success);
            result.put("attendanceData", attendanceData);
            result.put("timestamp", System.currentTimeMillis());
            
            if (success) {
                return ResultWrapper.wrapSuccess(result);
            } else {
                return ResultWrapper.wrapFailure("3001", "Attendance sync test failed", result);
            }
            
        } catch (Exception e) {
            log.error("Attendance sync test failed: {}", e.getMessage());
            return ResultWrapper.wrapFailure("3000", "Attendance sync test error: " + e.getMessage());
        }
    }

    /**
     * Get integration status and configuration
     */
    @GetMapping("/status")
    public BaseResult getIntegrationStatus() {
        try {
            Map<String, Object> status = new HashMap<>();
            status.put("javaServiceVersion", "1.0.0");
            status.put("javaServicePort", 8081);
            status.put("mernBackendUrl", "http://localhost:5000");
            status.put("integrationEnabled", true);
            status.put("uptime", System.currentTimeMillis());
            
            // Test MERN connectivity
            boolean mernConnected = mernBackendService.testConnection();
            status.put("mernBackendStatus", mernConnected ? "connected" : "disconnected");
            
            return ResultWrapper.wrapSuccess(status);
            
        } catch (Exception e) {
            log.error("Failed to get integration status: {}", e.getMessage());
            return ResultWrapper.wrapFailure("4000", "Failed to get integration status: " + e.getMessage());
        }
    }
}