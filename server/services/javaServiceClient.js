const axios = require('axios');

class JavaServiceClient {
  constructor() {
    this.baseURL = process.env.JAVA_SERVICE_URL || 'http://localhost:8081';
    this.timeout = parseInt(process.env.JAVA_SERVICE_TIMEOUT) || 120000; // Increased to 2 minutes for image processing
    this.authKey = process.env.JAVA_SERVICE_AUTH_KEY || 'java-service-auth-key-2025';
    this.enabled = process.env.ENABLE_JAVA_INTEGRATION === 'true';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Auth': this.authKey,
        'User-Agent': 'MERN-Backend/1.0'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔵 Java Service Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Java Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`🟢 Java Service Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`🔴 Java Service Error: ${error.response?.status || 'NETWORK_ERROR'} ${error.config?.url || 'UNKNOWN'}`, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test connectivity with Java service
   */
  async testConnection() {
    if (!this.enabled) {
      throw new Error('Java service integration is disabled');
    }

    try {
      const response = await this.client.get('/api/integration/test');
      return response.data;
    } catch (error) {
      throw new Error(`Java service connection failed: ${error.message}`);
    }
  }

  /**
   * Get integration status from Java service
   */
  async getIntegrationStatus() {
    if (!this.enabled) {
      return { enabled: false, message: 'Integration disabled' };
    }

    try {
      const response = await this.client.get('/api/integration/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Java service status: ${error.message}`);
    }
  }

  /**
   * Send employee enrollment request to Java service
   */
  async enrollEmployee(employeeData) {
    if (!this.enabled) {
      console.log('Java service integration disabled, skipping employee enrollment');
      return { success: true, message: 'Integration disabled' };
    }

    try {
      const response = await this.client.post('/api/employee/enroll', employeeData);
      return response.data;
    } catch (error) {
      throw new Error(`Employee enrollment failed: ${error.message}`);
    }
  }

  /**
   * Request attendance data from Java service/device
   */
  async getAttendanceFromDevice(deviceKey, secret, employeeId, startDate, endDate) {
    if (!this.enabled) {
      throw new Error('Java service integration is disabled');
    }

    try {
      const requestData = {
        deviceKey,
        secret,
        employeeId,
        startDate,
        endDate
      };

      const response = await this.client.post('/api/attendance/records', requestData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get attendance from device: ${error.message}`);
    }
  }

  /**
   * Update device configuration via Java service
   */
  async updateDeviceConfig(deviceKey, secret, configData) {
    if (!this.enabled) {
      console.log('Java service integration disabled, skipping device config update');
      return { success: true, message: 'Integration disabled' };
    }

    try {
      const requestData = {
        deviceKey,
        secret,
        ...configData
      };

      const response = await this.client.post('/api/device/configure', requestData);
      return response.data;
    } catch (error) {
      throw new Error(`Device config update failed: ${error.message}`);
    }
  }

  /**
   * Check if Java service integration is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get configuration details
   */
  getConfig() {
    return {
      enabled: this.enabled,
      baseURL: this.baseURL,
      timeout: this.timeout,
      authKey: this.authKey ? '***masked***' : 'not set'
    };
  }
}

module.exports = new JavaServiceClient();