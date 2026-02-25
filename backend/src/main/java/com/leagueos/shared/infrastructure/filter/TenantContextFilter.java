package com.leagueos.shared.infrastructure.filter;

import com.leagueos.shared.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

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
                System.out.println("TenantContextFilter: Set Tenant ID to " + tenantId);
            } catch (IllegalArgumentException e) {
                // Invalid UUID format, ignore or log
                System.err.println("Invalid Tenant ID format in header: " + tenantIdHeader);
            }
        } else {
            System.out.println("TenantContextFilter: No X-Tenant-ID header found.");
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Ensure context is cleared after request processing to prevent leakage in thread pool
            TenantContext.clear();
        }
    }
}
