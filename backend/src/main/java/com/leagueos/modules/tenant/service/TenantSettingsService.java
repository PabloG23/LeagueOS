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
        UUID tenantId = TenantContext.getCurrentTenant();
        Optional<TenantSettings> settingsOpt = tenantId != null 
                ? repository.findByTenantId(tenantId)
                : repository.findAll().stream().findFirst();

        return settingsOpt.orElseGet(() -> {
            TenantSettings defaultSettings = new TenantSettings();
            return defaultSettings;
        });
    }
}
