package com.hfims.xcan.gateway.tcp.demo.service;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

@Service
@Slf4j
public class MernBackendService {

    @Autowired
    private WebClient mernWebClient;

    /**
     * Test connectivity with MERN backend
     */
    public boolean testConnection() {
        try {
            String response = mernWebClient
                    .get()
                    .uri("/api/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            log.info("MERN Backend connection test successful: {}", response);
            return true;
        } catch (Exception e) {
            log.error("Failed to connect to MERN backend: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Sync employee data to MERN backend
     */
    public boolean syncEmployee(Map<String, Object> employeeData) {
        try {
            log.info("Syncing employee to MERN backend: {}", JSON.toJSONString(employeeData));
            
            String response = mernWebClient
                    .post()
                    .uri("/api/integration/employee/sync")
                    .bodyValue(employeeData)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            log.info("Employee sync successful: {}", response);
            return true;
        } catch (WebClientResponseException e) {
            log.error("Failed to sync employee - Status: {}, Response: {}", 
                     e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("Failed to sync employee: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Send attendance record to MERN backend
     */
    public boolean sendAttendanceRecord(Map<String, Object> attendanceData) {
        try {
            log.info("Sending attendance record to MERN backend: {}", JSON.toJSONString(attendanceData));
            
            String response = mernWebClient
                    .post()
                    .uri("/api/xo5/record")
                    .bodyValue(attendanceData)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            log.info("Attendance record sent successfully: {}", response);
            return true;
        } catch (WebClientResponseException e) {
            log.error("Failed to send attendance record - Status: {}, Response: {}", 
                     e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("Failed to send attendance record: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Update device status in MERN backend
     */
    public boolean updateDeviceStatus(String deviceId, String status, Map<String, Object> metadata) {
        try {
            JSONObject statusData = new JSONObject();
            statusData.put("deviceId", deviceId);
            statusData.put("status", status);
            statusData.put("timestamp", System.currentTimeMillis());
            statusData.put("metadata", metadata);

            log.info("Updating device status in MERN backend: {}", statusData.toJSONString());
            
            String response = mernWebClient
                    .post()
                    .uri("/api/integration/device/status")
                    .bodyValue(statusData)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();

            log.info("Device status updated successfully: {}", response);
            return true;
        } catch (Exception e) {
            log.error("Failed to update device status: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Generic POST request to MERN backend
     */
    public Mono<String> sendPostRequest(String endpoint, Object data) {
        return mernWebClient
                .post()
                .uri(endpoint)
                .bodyValue(data)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(30));
    }

    /**
     * Generic GET request to MERN backend
     */
    public Mono<String> sendGetRequest(String endpoint) {
        return mernWebClient
                .get()
                .uri(endpoint)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(30));
    }
}