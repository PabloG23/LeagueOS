#!/bin/bash
echo "Compiling Backend..."
mvn clean compile

echo "Starting Spring Boot Application..."
mvn spring-boot:run
