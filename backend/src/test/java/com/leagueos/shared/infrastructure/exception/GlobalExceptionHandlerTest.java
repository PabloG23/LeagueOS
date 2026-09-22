package com.leagueos.shared.infrastructure.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    private void dummyMethod(UUID param) {}

    @Test
    @DisplayName("Should handle MissingRequestHeaderException returning BAD_REQUEST 400")
    void handleMissingRequestHeaderException_returnsBadRequest() throws NoSuchMethodException {
        Method method = getClass().getDeclaredMethod("dummyMethod", UUID.class);
        MethodParameter methodParameter = new MethodParameter(method, 0);
        MissingRequestHeaderException ex = new MissingRequestHeaderException("X-Tenant-ID", methodParameter);

        ResponseEntity<Map<String, Object>> response = handler.handleMissingRequestHeaderException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("status")).isEqualTo(400);
        assertThat(response.getBody().get("error")).isEqualTo("Encabezado Requerido Faltante");
        assertThat(response.getBody().get("message")).isEqualTo("El encabezado 'X-Tenant-ID' es obligatorio.");
    }

    @Test
    @DisplayName("Should handle MissingServletRequestParameterException returning BAD_REQUEST 400")
    void handleMissingServletRequestParameterException_returnsBadRequest() {
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("seasonId", "String");

        ResponseEntity<Map<String, Object>> response = handler.handleMissingServletRequestParameterException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("status")).isEqualTo(400);
        assertThat(response.getBody().get("error")).isEqualTo("Parámetro Requerido Faltante");
        assertThat(response.getBody().get("message")).isEqualTo("El parámetro de consulta 'seasonId' es obligatorio.");
    }
}
