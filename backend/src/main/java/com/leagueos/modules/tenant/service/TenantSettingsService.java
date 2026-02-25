package com.leagueos.modules.tenant.service;

import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.persistence.TenantSettingsRepository;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantSettingsService {

    private final TenantSettingsRepository repository;

    public TenantSettings getCurrentSettings() {
        // Since the tenantFilter is enabled by the Aspect, findAll() will only return 
        // records for the current tenant. We expect 0 or 1.
        System.out.println("TenantSettingsService: Getting settings. Current Tenant Context: " + TenantContext.getCurrentTenant());
        return repository.findAll().stream()
                .findFirst()
                .orElseGet(() -> {
                    // Fallback: If no settings exist, return default object (not persisted)
                    // or potentially create one. For now, returning default DTO-like object.
                    TenantSettings defaultSettings = new TenantSettings();
                    // We don't set ID or TenantID here as it's transient
                    return defaultSettings; 
                });
    }
}
