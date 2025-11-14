# Multi-stage build for Java Spring Boot application
FROM openjdk:11-jre-slim as runtime

# Set working directory
WORKDIR /app

# Copy the built JAR file (adjust path as needed)
COPY java-attendance-service/target/*.jar app.jar

# Expose the port
EXPOSE 8081

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8081/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]