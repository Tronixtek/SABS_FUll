package com.hfims.xcan.gateway.tcp.demo.web;

import com.hfims.xcan.gateway.netty.client.dto.HostInfoDto;
import com.hfims.xcan.gateway.netty.error.CgiErrorEnum;
import com.hfims.xcan.gateway.netty.error.CgiErrorException;
import com.hfims.xcan.gateway.netty.util.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.annotation.PostConstruct;

@Component
public abstract class BaseController {

    @Value("${device.ip:localhost}")
    private String deviceIp;
    
    @Value("${device.port:10011}")
    private int devicePort;
    
    @Value("${device.timeout:900000}")
    private int deviceTimeout;
    
    protected HostInfoDto hostInfo;  // Make it protected so subclasses can access it
    
    @PostConstruct
    private void initializeHostInfo() {
        String finalDeviceIp = getDeviceIpFromConfig();
        System.out.println("DEBUG - Gateway Host Info: " + finalDeviceIp + ":" + devicePort + " (timeout: " + deviceTimeout + "ms)");
        hostInfo = new HostInfoDto(finalDeviceIp, devicePort, deviceTimeout);
    }
    
    // Initialize after Spring injection
    protected HostInfoDto getHostInfo() {
        if (hostInfo == null) {
            initializeHostInfo();
        }
        return hostInfo;
    }
    
    // Dynamic device IP configuration - prioritize environment variables, then properties
    private String getDeviceIpFromConfig() {
        // 1. Check environment variable
        String envIp = System.getenv("DEVICE_IP");
        if (envIp != null && !envIp.trim().isEmpty()) {
            System.out.println("Using DEVICE_IP from environment: " + envIp);
            return envIp.trim();
        }
        
        // 2. Check system property
        String propIp = System.getProperty("device.ip");
        if (propIp != null && !propIp.trim().isEmpty()) {
            System.out.println("Using device.ip from system property: " + propIp);
            return propIp.trim();
        }
        
        // 3. Use Spring configuration property
        System.out.println("Using device.ip from application.properties: " + deviceIp);
        return deviceIp;
    }

    protected void validateCommon(String deviceKey, String secret)
            throws CgiErrorException {
        if (StringUtils.isBlank(deviceKey) || deviceKey.length() < 16) {
            throw new CgiErrorException(CgiErrorEnum.CODE_1000);
        }
        if (StringUtils.isBlank(secret)) {
            throw new CgiErrorException(CgiErrorEnum.CODE_1000);
        }
    }
}
