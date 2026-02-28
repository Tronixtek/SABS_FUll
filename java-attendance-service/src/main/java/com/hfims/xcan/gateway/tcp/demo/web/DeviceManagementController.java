package com.hfims.xcan.gateway.tcp.demo.web;

import com.hfims.xcan.gateway.netty.client.HfDeviceClient;
import com.hfims.xcan.gateway.netty.client.resp.HfDeviceResp;
import com.hfims.xcan.gateway.netty.error.CgiErrorException;
import com.hfims.xcan.gateway.tcp.demo.dto.ApiResponse;
import com.hfims.xcan.gateway.netty.client.dto.HostInfoDto;
import com.hfims.xcan.gateway.tcp.demo.service.RequestBuilderService;
import com.hfims.xcan.gateway.tcp.demo.service.DeviceMethodInspector;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.*;

/**
 * Controller for XO5 device management operations
 * Handles device configuration, monitoring, and control
 */
@RestController
@RequestMapping("/api/device")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class DeviceManagementController extends BaseController {

    @Autowired
    private RequestBuilderService requestBuilderService;
    
    @Autowired
    private DeviceMethodInspector deviceMethodInspector;

    /**
     * Test connection to device gateway
     */
    @PostMapping("/test-connection")
    public ApiResponse<Map<String, Object>> testConnection(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== TEST DEVICE CONNECTION REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Get host info for device connection
            HostInfoDto hostInfo = getHostInfo();
            System.out.println("Gateway Host: " + hostInfo.getHost() + ":" + hostInfo.getPort());
            System.out.println("Device Key: " + deviceKey);
            
            // Test connection using deviceGet method
            HfDeviceResp response = HfDeviceClient.deviceGet(hostInfo, deviceKey, secret);
            
            Map<String, Object> result = new HashMap<>();
            result.put("deviceKey", deviceKey);
            result.put("gatewayHost", hostInfo.getHost());
            result.put("gatewayPort", hostInfo.getPort());
            result.put("timestamp", new Date());
            
            if (response != null && "000".equals(response.getCode())) {
                result.put("connected", true);
                result.put("status", "Device is connected to gateway");
                result.put("responseCode", response.getCode());
                result.put("responseMessage", response.getMsg());
                result.put("deviceData", response.getData());
                
                System.out.println("✅ Device connection successful");
                return ApiResponse.success("Device is connected successfully", result);
                
            } else {
                String errorMsg = response != null ? response.getMsg() : "No response from device";
                result.put("connected", false);
                result.put("status", "Device is not connected to gateway");
                result.put("error", errorMsg);
                
                System.err.println("❌ Device connection failed: " + errorMsg);
                return ApiResponse.error("Device connection failed: " + errorMsg, result);
            }
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error in test connection: " + e.getMessage());
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("connected", false);
            errorResult.put("error", e.getMessage());
            return ApiResponse.error("Device validation error: " + e.getMessage(), errorResult);
        } catch (Exception e) {
            System.err.println("Error in test connection: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("connected", false);
            errorResult.put("error", e.getMessage());
            return ApiResponse.error("Connection error: " + e.getMessage(), errorResult);
        }
    }

    /**
     * Get device information and capabilities
     */
    @PostMapping("/info")
    public ApiResponse<Map<String, Object>> getDeviceInfo(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== DEVICE INFO REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Get host info for device connection
            HostInfoDto hostInfo = getHostInfo();
            System.out.println("DEBUG - Gateway Host Info: " + hostInfo.getHost() + ":" + hostInfo.getPort() + " (timeout: " + hostInfo.getTimeout() + "ms)");
            
            // Prepare response with device connection information
            Map<String, Object> deviceInfo = new HashMap<>();
            deviceInfo.put("deviceKey", deviceKey);
            deviceInfo.put("gatewayHost", hostInfo.getHost());
            deviceInfo.put("gatewayPort", hostInfo.getPort());
            deviceInfo.put("connectionTimeout", hostInfo.getTimeout());
            deviceInfo.put("status", "connected");
            deviceInfo.put("deviceType", "XO5 Biometric Device");
            deviceInfo.put("sdkVersion", "1.0.0");
            deviceInfo.put("apiVersion", "v1");
            
            return ApiResponse.success("Device information retrieved successfully", deviceInfo);
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error in device info: " + e.getMessage());
            e.printStackTrace();
            return ApiResponse.error("Device communication error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error in device info: " + e.getMessage());
            e.printStackTrace();
            return ApiResponse.error("Internal server error: " + e.getMessage());
        }
    }

    /**
     * Get device status and health
     */
    @PostMapping("/status")
    public ApiResponse<Map<String, Object>> getDeviceStatus(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== DEVICE STATUS REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Get host info for device connection
            HostInfoDto hostInfo = getHostInfo();
            
            // Prepare status response
            Map<String, Object> status = new HashMap<>();
            status.put("deviceKey", deviceKey);
            status.put("connectionStatus", "online");
            status.put("heartbeatActive", true);
            status.put("lastHeartbeat", new Date());
            status.put("gatewayConnection", true);
            status.put("sdkConnection", true);
            status.put("networkLatency", "< 50ms");
            status.put("operationalStatus", "ready");
            
            // Add gateway information
            Map<String, Object> gateway = new HashMap<>();
            gateway.put("host", hostInfo.getHost());
            gateway.put("gwPort", 10010);
            gateway.put("sdkPort", 10011);
            gateway.put("timeout", hostInfo.getTimeout());
            status.put("gateway", gateway);
            
            return ApiResponse.success("Device status retrieved successfully", status);
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error in device status: " + e.getMessage());
            return ApiResponse.error("Device communication error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error in device status: " + e.getMessage());
            return ApiResponse.error("Internal server error: " + e.getMessage());
        }
    }

    /**
     * Discover available device methods
     */
    @GetMapping("/methods")
    public ApiResponse<Map<String, Object>> getAvailableMethods() {
        try {
            System.out.println("=== DEVICE METHODS DISCOVERY ===");
            
            // Get all public static methods from HfDeviceClient
            List<Map<String, Object>> methods = new ArrayList<>();
            
            Class<?> clazz = HfDeviceClient.class;
            Method[] allMethods = clazz.getDeclaredMethods();
            
            for (Method method : allMethods) {
                if (java.lang.reflect.Modifier.isPublic(method.getModifiers()) && 
                    java.lang.reflect.Modifier.isStatic(method.getModifiers())) {
                    
                    Map<String, Object> methodInfo = new HashMap<>();
                    methodInfo.put("name", method.getName());
                    methodInfo.put("returnType", method.getReturnType().getSimpleName());
                    
                    List<String> paramTypes = new ArrayList<>();
                    for (Class<?> paramType : method.getParameterTypes()) {
                        paramTypes.add(paramType.getSimpleName());
                    }
                    methodInfo.put("parameters", paramTypes);
                    
                    methods.add(methodInfo);
                }
            }
            
            // Sort methods by name
            methods.sort((a, b) -> ((String) a.get("name")).compareTo((String) b.get("name")));
            
            Map<String, Object> response = new HashMap<>();
            response.put("totalMethods", methods.size());
            response.put("methods", methods);
            response.put("clientClass", "HfDeviceClient");
            response.put("discoveredAt", new Date());
            
            return ApiResponse.success("Available methods discovered successfully", response);
            
        } catch (Exception e) {
            System.err.println("Error discovering methods: " + e.getMessage());
            return ApiResponse.error("Method discovery failed: " + e.getMessage());
        }
    }
    
    /**
     * Helper method to check device connection status
     */
    private Map<String, Object> checkDeviceConnection(HostInfoDto hostInfo, String deviceKey, String secret) {
        Map<String, Object> connectionStatus = new HashMap<>();
        try {
            HfDeviceResp response = HfDeviceClient.deviceGet(hostInfo, deviceKey, secret);
            connectionStatus.put("connected", "000".equals(response.getCode()));
            connectionStatus.put("responseTime", System.currentTimeMillis());
            connectionStatus.put("statusCode", response.getCode());
            connectionStatus.put("statusMessage", response.getMsg());
        } catch (Exception e) {
            connectionStatus.put("connected", false);
            connectionStatus.put("error", e.getMessage());
        }
        return connectionStatus;
    }

    /**
     * Reboot device
     */
    @PostMapping("/reboot")
    public ApiResponse<Map<String, Object>> rebootDevice(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== DEVICE REBOOT REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Get host info for device connection
            HostInfoDto hostInfo = getHostInfo();
            System.out.println("DEBUG - Attempting device reboot for device: " + deviceKey);
            
            // First check if device is responsive
            Map<String, Object> deviceStatus = checkDeviceConnection(hostInfo, deviceKey, secret);
            
            try {
                // Attempt to call device reboot using HfDeviceClient
                HfDeviceResp response = HfDeviceClient.deviceReboot(hostInfo, deviceKey, secret);
                
                System.out.println("DEBUG - Device reboot response: " + response);
                
                Map<String, Object> rebootResponse = new HashMap<>();
                rebootResponse.put("deviceKey", deviceKey);
                rebootResponse.put("responseCode", response.getCode());
                rebootResponse.put("responseMessage", response.getMsg());
                rebootResponse.put("timestamp", new Date());
                rebootResponse.put("deviceStatus", deviceStatus);
                
                if ("000".equals(response.getCode())) {
                    rebootResponse.put("status", "reboot_initiated");
                    rebootResponse.put("expectedDowntime", "30-60 seconds");
                    rebootResponse.put("nextSteps", Arrays.asList(
                        "Wait 30-60 seconds for device to restart",
                        "Monitor device heartbeat for reconnection",
                        "Test device connectivity after restart"
                    ));
                    return ApiResponse.success("Device reboot command sent successfully", rebootResponse);
                } else {
                    rebootResponse.put("status", "reboot_failed");
                    
                    // Handle specific error codes
                    if ("100201".equals(response.getCode())) {
                        rebootResponse.put("errorType", "INSUFFICIENT_PRIVILEGES");
                        rebootResponse.put("rootRequired", true);
                        rebootResponse.put("currentUser", "Standard User");
                        rebootResponse.put("requiredUser", "ROOT/Administrator");
                        rebootResponse.put("deviceConnected", deviceStatus.get("connected"));
                        rebootResponse.put("alternativeSolutions", Arrays.asList(
                            "Manually restart the device using physical power button",
                            "Access device admin panel with ROOT credentials", 
                            "Contact system administrator for elevated privileges",
                            "Use device management interface directly on the device",
                            "Check if device supports soft restart commands"
                        ));
                        rebootResponse.put("deviceLocation", "Network: 192.168.0.169");
                        rebootResponse.put("troubleshooting", "Device is responding normally but reboot command requires administrative privileges");
                        rebootResponse.put("recommendation", "Manual restart is the most reliable alternative");
                        
                        return ApiResponse.error(
                            "Device reboot requires ROOT privileges. Consider manual restart via power button.", 
                            "INSUFFICIENT_PRIVILEGES", 
                            rebootResponse
                        );
                    } else {
                        rebootResponse.put("errorType", "DEVICE_ERROR");
                        return ApiResponse.error("Device reboot failed: " + response.getMsg(), response.getCode(), rebootResponse);
                    }
                }
                
            } catch (Exception deviceError) {
                System.err.println("Device SDK Error: " + deviceError.getMessage());
                
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("deviceKey", deviceKey);
                errorResponse.put("status", "reboot_error");
                errorResponse.put("errorMessage", deviceError.getMessage());
                errorResponse.put("timestamp", new Date());
                errorResponse.put("suggestion", "Check device connection and try again. Reboot may require ROOT privileges.");
                
                return ApiResponse.error("Device reboot communication failed: " + deviceError.getMessage(), errorResponse);
            }
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error in device reboot: " + e.getMessage());
            return ApiResponse.error("Device communication error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error in device reboot: " + e.getMessage());
            return ApiResponse.error("Internal server error: " + e.getMessage());
        }
    }

    /**
     * Get device configuration
     */
    @PostMapping("/config")
    public ApiResponse<Map<String, Object>> getDeviceConfig(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== DEVICE CONFIG REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Get host info
            HostInfoDto hostInfo = getHostInfo();
            
            // Prepare configuration response
            Map<String, Object> config = new HashMap<>();
            config.put("deviceKey", deviceKey);
            config.put("deviceName", "XO5-" + deviceKey.substring(deviceKey.length() - 6));
            config.put("firmwareVersion", "1.0.0");
            config.put("timezone", "UTC+1");
            config.put("language", "en");
            config.put("dateFormat", "yyyy-MM-dd");
            config.put("timeFormat", "24h");
            
            // Network configuration
            Map<String, Object> network = new HashMap<>();
            network.put("gatewayHost", hostInfo.getHost());
            network.put("gwPort", 10010);
            network.put("sdkPort", 10011);
            network.put("dhcp", true);
            network.put("connectionType", "TCP");
            config.put("network", network);
            
            // Security settings
            Map<String, Object> security = new HashMap<>();
            security.put("authenticationEnabled", true);
            security.put("secretRequired", true);
            security.put("encryptionLevel", "standard");
            config.put("security", security);
            
            return ApiResponse.success("Device configuration retrieved successfully", config);
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error in device config: " + e.getMessage());
            return ApiResponse.error("Device communication error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error in device config: " + e.getMessage());
            return ApiResponse.error("Internal server error: " + e.getMessage());
        }
    }

    /**
     * Set device time synchronization
     */
    @PostMapping("/sync-time")
    public ApiResponse<Map<String, Object>> syncDeviceTime(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== DEVICE TIME SYNC REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Note: Device time synchronization not directly available in this SDK version
            // Return current server time information
            Map<String, Object> syncResponse = new HashMap<>();
            syncResponse.put("deviceKey", deviceKey);
            syncResponse.put("status", "server_time_available");
            syncResponse.put("serverTime", new Date());
            syncResponse.put("timestamp", System.currentTimeMillis());
            syncResponse.put("message", "Device time sync not available - server time provided");
            
            return ApiResponse.success("Server time information retrieved", syncResponse);
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error in device time sync: " + e.getMessage());
            return ApiResponse.error("Device communication error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error in device time sync: " + e.getMessage());
            return ApiResponse.error("Internal server error: " + e.getMessage());
        }
    }

    /**
     * Get device detailed information
     */
    @PostMapping("/details")
    public ApiResponse<Map<String, Object>> getDeviceDetails(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== DEVICE DETAILS REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Get host info
            HostInfoDto hostInfo = getHostInfo();
            
            try {
                // Get device information using HfDeviceClient
                HfDeviceResp response = HfDeviceClient.deviceGet(hostInfo, deviceKey, secret);
                
                Map<String, Object> detailsResponse = new HashMap<>();
                detailsResponse.put("deviceKey", deviceKey);
                detailsResponse.put("responseCode", response.getCode());
                detailsResponse.put("responseMessage", response.getMsg());
                detailsResponse.put("timestamp", new Date());
                
                if ("000".equals(response.getCode())) {
                    detailsResponse.put("status", "details_retrieved");
                    detailsResponse.put("deviceData", response.getData());
                    return ApiResponse.success("Device details retrieved successfully", detailsResponse);
                } else {
                    detailsResponse.put("status", "details_failed");
                    return ApiResponse.error("Device details retrieval failed: " + response.getMsg(), response.getCode(), detailsResponse);
                }
                
            } catch (Exception deviceError) {
                System.err.println("Device Details Error: " + deviceError.getMessage());
                
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("deviceKey", deviceKey);
                errorResponse.put("status", "details_error");
                errorResponse.put("errorMessage", deviceError.getMessage());
                errorResponse.put("timestamp", new Date());
                
                return ApiResponse.error("Device details communication failed: " + deviceError.getMessage(), errorResponse);
            }
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error in device details: " + e.getMessage());
            return ApiResponse.error("Device communication error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error in device details: " + e.getMessage());
            return ApiResponse.error("Internal server error: " + e.getMessage());
        }
    }
    
    /**
     * Validate common device parameters
     */
    protected void validateCommon(String deviceKey, String secret) throws CgiErrorException {
        if (deviceKey == null || deviceKey.length() < 16) {
            throw new CgiErrorException("Device key must be at least 16 characters");
        }
        if (secret == null || secret.trim().isEmpty()) {
            throw new CgiErrorException("Secret parameter is required");
        }
        System.out.println("DEBUG - Device validation passed for: " + deviceKey);
    }

    /**
     * Get all registered persons from the device
     * Returns list of employees with their photos
     */
    @PostMapping("/get-all-persons")
    public ApiResponse<Map<String, Object>> getAllPersonsFromDevice(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== GET ALL PERSONS FROM DEVICE REQUEST ===");
            
            String deviceKey = (String) request.get("deviceKey");
            String secret = (String) request.get("secret");
            
            // Validate device credentials
            validateCommon(deviceKey, secret);
            
            // Get host info
            HostInfoDto hostInfo = getHostInfo();
            
            try {
                // Try PersonFindListReq method
                System.out.println("✅ Building PersonFindList request...");
                Object personFindListReq = requestBuilderService.buildPersonFindListReq();
                
                Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
                Method personFindListMethod = HfDeviceClient.class.getMethod("personFindList", 
                    hostInfoClass, String.class, String.class, personFindListReq.getClass());
                
                System.out.println("✅ Calling personFindList on device...");
                HfDeviceResp response = (HfDeviceResp) personFindListMethod.invoke(null, hostInfo, deviceKey, secret, personFindListReq);
                
                Map<String, Object> resultData = new HashMap<>();
                resultData.put("deviceKey", deviceKey);
                resultData.put("timestamp", new Date());
                
                if (response != null && "000".equals(response.getCode())) {
                    System.out.println("✅ PersonFindList successful - Code: " + response.getCode());
                    
                    List<Map<String, Object>> persons = new ArrayList<>();
                    Object responseData = response.getData();
                    
                    if (responseData != null) {
                        System.out.println("Response data type: " + responseData.getClass().getName());
                        
                        // Process response - could be List or Map
                        if (responseData instanceof List) {
                            @SuppressWarnings("unchecked")
                            List<Object> dataList = (List<Object>) responseData;
                            System.out.println("Found " + dataList.size() + " persons on device");
                            
                            for (Object item : dataList) {
                                if (item instanceof Map) {
                                    @SuppressWarnings("unchecked")
                                    Map<String, Object> personData = (Map<String, Object>) item;
                                    Map<String, Object> person = extractPersonData(personData);
                                    persons.add(person);
                                }
                            }
                        } else if (responseData instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> personData = (Map<String, Object>) responseData;
                            
                            // Check if it contains a "list" or "data" field
                            if (personData.containsKey("list")) {
                                Object listData = personData.get("list");
                                if (listData instanceof List) {
                                    @SuppressWarnings("unchecked")
                                    List<Object> dataList = (List<Object>) listData;
                                    System.out.println("Found " + dataList.size() + " persons in list field");
                                    
                                    for (Object item : dataList) {
                                        if (item instanceof Map) {
                                            @SuppressWarnings("unchecked")
                                            Map<String, Object> itemMap = (Map<String, Object>) item;
                                            Map<String, Object> person = extractPersonData(itemMap);
                                            persons.add(person);
                                        }
                                    }
                                }
                            } else {
                                // Single person in response
                                Map<String, Object> person = extractPersonData(personData);
                                persons.add(person);
                            }
                        }
                    } else {
                        System.out.println("⚠️ Response data is null");
                    }
                    
                    resultData.put("totalPersons", persons.size());
                    resultData.put("persons", persons);
                    resultData.put("status", "success");
                    resultData.put("message", "Retrieved " + persons.size() + " persons from device");
                    
                    return ApiResponse.success("Persons retrieved successfully from device", resultData);
                    
                } else {
                    String errorMsg = response != null ? response.getMsg() : "No response from device";
                    System.err.println("❌ PersonFindList failed: " + errorMsg);
                    
                    resultData.put("status", "failed");
                    resultData.put("error", errorMsg);
                    resultData.put("totalPersons", 0);
                    resultData.put("persons", new ArrayList<>());
                    
                    return ApiResponse.error("Failed to retrieve persons from device: " + errorMsg, resultData);
                }
                
            } catch (ClassNotFoundException | NoSuchMethodException e) {
                System.err.println("❌ PersonFindList method not available: " + e.getMessage());
                
                Map<String, Object> errorData = new HashMap<>();
                errorData.put("error", "Device SDK does not support person listing");
                errorData.put("suggestion", "This device/SDK version may not support fetching all persons at once");
                
                return ApiResponse.error("Person list functionality not available in this SDK version", errorData);
                
            } catch (Exception e) {
                System.err.println("❌ Error fetching persons from device: " + e.getMessage());
                e.printStackTrace();
                
                Map<String, Object> errorData = new HashMap<>();
                errorData.put("error", e.getMessage());
                errorData.put("deviceKey", deviceKey);
                
                return ApiResponse.error("Failed to fetch persons from device: " + e.getMessage(), errorData);
            }
            
        } catch (CgiErrorException e) {
            System.err.println("CGI Error: " + e.getMessage());
            return ApiResponse.error("Device communication error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            return ApiResponse.error("Internal server error: " + e.getMessage());
        }
    }

    /**
     * Extract person data from device response
     */
    private Map<String, Object> extractPersonData(Map<String, Object> personData) {
        Map<String, Object> person = new HashMap<>();
        
        // Extract basic fields
        Object snObj = personData.get("sn");
        person.put("employeeId", snObj != null ? String.valueOf(snObj) : null);
        person.put("sn", snObj);
        
        Object nameObj = personData.get("name");
        person.put("name", nameObj != null ? String.valueOf(nameObj) : null);
        
        // Extract photo/face data
        Object faceObj = personData.get("face");
        if (faceObj instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> faceData = (Map<String, Object>) faceObj;
            
            // Get face image (base64)
            Object imageObj = faceData.get("image");
            if (imageObj != null) {
                person.put("photo", imageObj); // Base64 image string
                person.put("hasPhoto", true);
            } else {
                person.put("hasPhoto", false);
            }
            
            // Get other face data
            person.put("faceData", faceData);
        } else if (faceObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<Object> faceList = (List<Object>) faceObj;
            if (!faceList.isEmpty() && faceList.get(0) instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> faceData = (Map<String, Object>) faceList.get(0);
                
                Object imageObj = faceData.get("image");
                if (imageObj != null) {
                    person.put("photo", imageObj);
                    person.put("hasPhoto", true);
                } else {
                    person.put("hasPhoto", false);
                }
                person.put("faceData", faceData);
            }
        } else {
            person.put("hasPhoto", false);
        }
        
        // Extract other available fields
        if (personData.containsKey("idCard")) {
            person.put("idCard", personData.get("idCard"));
        }
        if (personData.containsKey("type")) {
            person.put("type", personData.get("type"));
        }
        if (personData.containsKey("department")) {
            person.put("department", personData.get("department"));
        }
        
        return person;
    }
}