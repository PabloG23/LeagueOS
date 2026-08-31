package com.leagueos.shared.infrastructure.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RateLimitingFilter — Brute-force & DoS Protection")
class RateLimitingFilterTest {

    private RateLimitingFilter rateLimitingFilter;

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        rateLimitingFilter = new RateLimitingFilter();
    }

    // =========================================================================
    // Login Rate Limiting (10 requests/minute)
    // =========================================================================

    @Nested
    @DisplayName("Login endpoint rate limiting")
    class LoginRateLimiting {

        @Test
        @DisplayName("should allow up to 10 POST login requests per minute")
        void allowsUpTo10Requests() throws ServletException, IOException {
            String clientIp = "192.168.1.100";

            for (int i = 1; i <= 10; i++) {
                MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
                request.setRemoteAddr(clientIp);
                MockHttpServletResponse response = new MockHttpServletResponse();

                rateLimitingFilter.doFilterInternal(request, response, filterChain);

                assertThat(response.getStatus()).isEqualTo(200);
            }

            verify(filterChain, times(10)).doFilter(any(), any());
        }

        @Test
        @DisplayName("should return HTTP 429 Too Many Requests on the 11th login attempt")
        void blocks11thRequest() throws ServletException, IOException {
            String clientIp = "192.168.1.101";

            // Exhaust the 10 allowed requests
            for (int i = 1; i <= 10; i++) {
                MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
                request.setRemoteAddr(clientIp);
                MockHttpServletResponse response = new MockHttpServletResponse();
                rateLimitingFilter.doFilterInternal(request, response, filterChain);
            }

            // 11th request from the same IP
            MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/login");
            blockedRequest.setRemoteAddr(clientIp);
            MockHttpServletResponse blockedResponse = new MockHttpServletResponse();

            rateLimitingFilter.doFilterInternal(blockedRequest, blockedResponse, filterChain);

            assertThat(blockedResponse.getStatus()).isEqualTo(429);
            assertThat(blockedResponse.getContentAsString()).contains("Has superado el límite de intentos de inicio de sesión");
            // FilterChain should still have only been called 10 times, not 11
            verify(filterChain, times(10)).doFilter(any(), any());
        }

        @Test
        @DisplayName("should track different IPs independently")
        void isolatesDifferentIps() throws ServletException, IOException {
            String ip1 = "10.0.0.1";
            String ip2 = "10.0.0.2";

            // Exhaust IP 1
            for (int i = 1; i <= 10; i++) {
                MockHttpServletRequest req1 = new MockHttpServletRequest("POST", "/api/auth/login");
                req1.setRemoteAddr(ip1);
                rateLimitingFilter.doFilterInternal(req1, new MockHttpServletResponse(), filterChain);
            }

            // IP 2 makes its 1st request -> should be allowed
            MockHttpServletRequest req2 = new MockHttpServletRequest("POST", "/api/auth/login");
            req2.setRemoteAddr(ip2);
            MockHttpServletResponse res2 = new MockHttpServletResponse();

            rateLimitingFilter.doFilterInternal(req2, res2, filterChain);

            assertThat(res2.getStatus()).isEqualTo(200);
            verify(filterChain, times(11)).doFilter(any(), any());
        }
    }

    // =========================================================================
    // Non-Rate-Limited Endpoints
    // =========================================================================

    @Nested
    @DisplayName("Non-limited endpoints")
    class NonLimitedEndpoints {

        @Test
        @DisplayName("GET requests and non-auth endpoints should not be throttled")
        void passesNonLimitedRequests() throws ServletException, IOException {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/leagues/teams");
            request.setRemoteAddr("192.168.1.50");
            MockHttpServletResponse response = new MockHttpServletResponse();

            rateLimitingFilter.doFilterInternal(request, response, filterChain);

            assertThat(response.getStatus()).isEqualTo(200);
            verify(filterChain, times(1)).doFilter(request, response);
        }
    }
}
