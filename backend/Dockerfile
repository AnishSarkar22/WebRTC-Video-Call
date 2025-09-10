# Use Eclipse Temurin JDK 21 as base image
FROM eclipse-temurin:21-jre

# Set working directory
WORKDIR /app

# Copy the built jar file (update the jar name if needed)
COPY target/webrtc-backend.jar app.jar

# Expose the default Spring Boot port
EXPOSE 8000

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
