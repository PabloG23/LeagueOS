#!/bin/bash
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "Compiling Backend..."
mvn clean compile

echo "Starting Spring Boot Application..."
mvn spring-boot:run
