package com.leagueos.shared.infrastructure.filter;

import com.leagueos.shared.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
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

        if (StringUtils.hasText(tenantIdHeader)) {
            try {
                UUID tenantId = UUID.fromString(tenantIdHeader);
                TenantContext.setCurrentTenant(tenantId);
                log.debug("TenantContextFilter: tenant set to {}", tenantId);
            } catch (IllegalArgumentException e) {
                log.warn("TenantContextFilter: invalid UUID format in {} header: '{}'", TENANT_HEADER, tenantIdHeader);
                response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                        "Invalid " + TENANT_HEADER + " header format. Expected a valid UUID.");
                return;
            }
        } else {
            log.debug("TenantContextFilter: no {} header present", TENANT_HEADER);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Clear context after request to prevent thread-local leakage in thread pools
            TenantContext.clear();
        }
    }
}
