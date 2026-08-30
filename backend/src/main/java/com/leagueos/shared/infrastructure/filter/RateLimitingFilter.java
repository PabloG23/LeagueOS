package com.leagueos.shared.infrastructure.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_LOGIN_REQUESTS_PER_MINUTE = 10;
    private static final int MAX_OCR_REQUESTS_PER_MINUTE = 25;
    private static final long WINDOW_MS = 60_000L; // 1 minute window

    private final Map<String, Deque<Long>> loginRequests = new ConcurrentHashMap<>();
    private final Map<String, Deque<Long>> ocrRequests = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        String clientIp = getClientIp(request);

        if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/auth/login")) {
            if (isRateLimited(loginRequests, clientIp, MAX_LOGIN_REQUESTS_PER_MINUTE)) {
                log.warn("RateLimitingFilter: Login rate limit exceeded for IP: {}", clientIp);
                sendRateLimitResponse(response, "Has superado el límite de intentos de inicio de sesión. Por favor espera un minuto antes de reintentar.");
                return;
            }
        } else if ("POST".equalsIgnoreCase(method) && path.contains("/verify-ine")) {
            if (isRateLimited(ocrRequests, clientIp, MAX_OCR_REQUESTS_PER_MINUTE)) {
                log.warn("RateLimitingFilter: OCR rate limit exceeded for IP: {}", clientIp);
                sendRateLimitResponse(response, "Has superado el límite de escaneo de identificaciones por minuto. Por favor espera un momento.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private synchronized boolean isRateLimited(Map<String, Deque<Long>> requestTracker, String ip, int maxRequests) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - WINDOW_MS;

        // Bounded map cleanup if memory exceeds 5000 tracked IPs
        if (requestTracker.size() > 5000) {
            requestTracker.entrySet().removeIf(entry -> {
                synchronized (entry.getValue()) {
                    entry.getValue().removeIf(timestamp -> timestamp < windowStart);
                    return entry.getValue().isEmpty();
                }
            });
        }

        Deque<Long> timestamps = requestTracker.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            // Remove timestamps outside the sliding window
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= maxRequests) {
                return true;
            }

            timestamps.addLast(now);
            return false;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> errorBody = Map.of(
                "status", HttpStatus.TOO_MANY_REQUESTS.value(),
                "error", "Demasiadas Solicitudes",
                "message", message,
                "timestamp", Instant.now().toString()
        );

        response.getWriter().write(objectMapper.writeValueAsString(errorBody));
    }
}
