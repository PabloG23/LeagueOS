package com.leagueos.shared.infrastructure.filter;

import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.security.CustomUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TenantContextFilter — HTTP tenant resolution")
class TenantContextFilterTest {

    @InjectMocks
    private TenantContextFilter tenantContextFilter;

    @Mock
    private FilterChain filterChain;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @BeforeEach
    void setUp() {
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    // -------------------------------------------------------------------------
    // Authenticated user scenarios
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("authenticated user: tenant from JWT token should be set in TenantContext")
    void authenticatedUser_setsTenantFromToken() throws ServletException, IOException {
        setUpAuthenticatedUser(TENANT_A);

        // Capture the tenant during filterChain.doFilter to verify it's set correctly
        doAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant())
                    .as("TenantContext should be set to token tenant during request")
                    .isEqualTo(TENANT_A);
            return null;
        }).when(filterChain).doFilter(request, response);

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        // After filter completes, context should be cleared
        assertThat(TenantContext.getCurrentTenant())
                .as("TenantContext should be cleared after request")
                .isNull();
    }

    @Test
    @DisplayName("authenticated user: matching X-Tenant-ID header should be allowed")
    void authenticatedUser_matchingHeader_allowed() throws ServletException, IOException {
        setUpAuthenticatedUser(TENANT_A);
        request.addHeader("X-Tenant-ID", TENANT_A.toString());

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("authenticated user: mismatched X-Tenant-ID header should return 403 Forbidden")
    void authenticatedUser_mismatchedHeader_returns403() throws ServletException, IOException {
        setUpAuthenticatedUser(TENANT_A);
        request.addHeader("X-Tenant-ID", TENANT_B.toString()); // different tenant!

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("authenticated user: nil UUID in X-Tenant-ID header should be ignored (not trigger mismatch)")
    void authenticatedUser_nilUuidHeader_isIgnored() throws ServletException, IOException {
        setUpAuthenticatedUser(TENANT_A);
        request.addHeader("X-Tenant-ID", "00000000-0000-0000-0000-000000000000");

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    // -------------------------------------------------------------------------
    // Unauthenticated (public) request scenarios
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("unauthenticated request: valid X-Tenant-ID header should set TenantContext")
    void unauthenticatedRequest_validHeader_setsTenantContext() throws ServletException, IOException {
        request.addHeader("X-Tenant-ID", TENANT_A.toString());

        doAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant())
                    .as("TenantContext should be set from header for public requests")
                    .isEqualTo(TENANT_A);
            return null;
        }).when(filterChain).doFilter(request, response);

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("unauthenticated request: invalid UUID in header should return 400 Bad Request")
    void unauthenticatedRequest_invalidUuid_returns400() throws ServletException, IOException {
        request.addHeader("X-Tenant-ID", "not-a-valid-uuid");

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        assertThat(response.getStatus()).isEqualTo(400);
    }

    @Test
    @DisplayName("unauthenticated request: no header should not set TenantContext and should proceed")
    void unauthenticatedRequest_noHeader_proceedsWithoutTenant() throws ServletException, IOException {
        // No header, no auth

        doAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant())
                    .as("TenantContext should remain null when no header is present")
                    .isNull();
            return null;
        }).when(filterChain).doFilter(request, response);

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    // -------------------------------------------------------------------------
    // ThreadLocal cleanup
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("TenantContext should always be cleared after filter chain, even if exception occurs")
    void tenantContext_clearedAfterException() throws ServletException, IOException {
        setUpAuthenticatedUser(TENANT_A);

        doThrow(new ServletException("simulated error"))
                .when(filterChain).doFilter(request, response);

        try {
            tenantContextFilter.doFilterInternal(request, response, filterChain);
        } catch (ServletException e) {
            // expected
        }

        assertThat(TenantContext.getCurrentTenant())
                .as("TenantContext MUST be cleared even after exceptions to prevent thread-local leakage")
                .isNull();
    }

    // -------------------------------------------------------------------------
    // Cross-tenant isolation: the critical test
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("ISOLATION: request for TENANT_A should never set TENANT_B in context")
    void isolation_tenantA_neverSetsTenantB() throws ServletException, IOException {
        setUpAuthenticatedUser(TENANT_A);

        doAnswer(invocation -> {
            UUID currentTenant = TenantContext.getCurrentTenant();
            assertThat(currentTenant)
                    .as("During request for TENANT_A, context should be TENANT_A only")
                    .isEqualTo(TENANT_A)
                    .isNotEqualTo(TENANT_B);
            return null;
        }).when(filterChain).doFilter(request, response);

        tenantContextFilter.doFilterInternal(request, response, filterChain);
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private void setUpAuthenticatedUser(UUID tenantId) {
        CustomUserDetails userDetails = new CustomUserDetails(
                "admin@test.com",
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_LEAGUE_ADMIN")),
                UUID.randomUUID(), // userId
                tenantId.toString(),
                null // teamId
        );

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
