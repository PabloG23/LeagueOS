package com.leagueos.modules.tenant.api;

import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tenants/settings")
@RequiredArgsConstructor
public class TenantSettingsController {

    private final TenantSettingsService service;

    @GetMapping("/current")
    public ResponseEntity<TenantSettings> getCurrentSettings() {
        return ResponseEntity.ok(service.getCurrentSettings());
    }

    @org.springframework.web.bind.annotation.PutMapping("/min-matches")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<TenantSettings> updateMinMatches(
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Tenant-ID", required = false) java.util.UUID tenantId,
            @org.springframework.web.bind.annotation.RequestParam("minMatches") int minMatches) {
        if (tenantId != null) {
            com.leagueos.shared.context.TenantContext.setCurrentTenant(tenantId);
        }
        try {
            return ResponseEntity.ok(service.updateMinMatchesForPlayoffs(minMatches, tenantId));
        } finally {
            com.leagueos.shared.context.TenantContext.clear();
        }
    }
}
