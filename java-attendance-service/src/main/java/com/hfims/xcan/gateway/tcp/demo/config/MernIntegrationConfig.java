package com.hfims.xcan.gateway.tcp.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class MernIntegrationConfig {

    @Value("${mern.backend.url:http://localhost:5000}")
    private String mernBackendUrl;

    @Value("${mern.backend.timeout:30000}")
    private int timeout;

    @Value("${service.auth.key:java-service-auth-key-2025}")
    private String serviceAuthKey;

    @Bean
    public WebClient mernWebClient() {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofMillis(timeout));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .baseUrl(mernBackendUrl)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("X-Service-Auth", serviceAuthKey)
                .defaultHeader("User-Agent", "Java-Service-Gateway/1.0")
                .build();
    }

    public String getMernBackendUrl() {
        return mernBackendUrl;
    }

    public String getServiceAuthKey() {
        return serviceAuthKey;
    }

    public int getTimeout() {
        return timeout;
    }
}