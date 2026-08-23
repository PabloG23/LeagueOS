package com.leagueos.shared.infrastructure.filter;

import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.security.CustomUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
public class TenantContextFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String tenantIdHeader = request.getHeader(TENANT_HEADER);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            // Authenticated user: tenant must come from the verified JWT token
            if (userDetails.getTenantId() != null) {
                try {
                    UUID tokenTenantId = UUID.fromString(userDetails.getTenantId());
                    
                    // If client also supplied an X-Tenant-ID header, ensure it matches their authenticated tenant
                    if (StringUtils.hasText(tenantIdHeader)) {
                        UUID headerTenantId = UUID.fromString(tenantIdHeader);
                        boolean isNilUuid = headerTenantId.getMostSignificantBits() == 0 && headerTenantId.getLeastSignificantBits() == 0;
                        if (!isNilUuid && !tokenTenantId.equals(headerTenantId)) {
                            log.warn("TenantContextFilter: Tenant mismatch! Authenticated tenant: {}, Requested header tenant: {}",
                                    tokenTenantId, headerTenantId);
                            response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                    "Access denied: Cannot access or modify data outside your authenticated tenant.");
                            return;
                        }
                    }
                    
                    TenantContext.setCurrentTenant(tokenTenantId);
                    log.debug("TenantContextFilter: tenant set from authenticated token to {}", tokenTenantId);
                } catch (IllegalArgumentException e) {
                    log.warn("TenantContextFilter: invalid tenant UUID in user token: {}", userDetails.getTenantId());
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid tenant format in token.");
                    return;
                }
            }
        } else if (StringUtils.hasText(tenantIdHeader)) {
            // Unauthenticated public request: resolve tenant from header for public league queries
            try {
                UUID tenantId = UUID.fromString(tenantIdHeader);
                TenantContext.setCurrentTenant(tenantId);
                log.debug("TenantContextFilter: public tenant set from header to {}", tenantId);
            } catch (IllegalArgumentException e) {
                log.warn("TenantContextFilter: invalid UUID format in {} header: '{}'", TENANT_HEADER, tenantIdHeader);
                response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                        "Invalid " + TENANT_HEADER + " header format. Expected a valid UUID.");
                return;
            }
        } else {
            log.debug("TenantContextFilter: no {} header present on unauthenticated request", TENANT_HEADER);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Clear context after request to prevent thread-local leakage in thread pools
            TenantContext.clear();
        }
    }
}
