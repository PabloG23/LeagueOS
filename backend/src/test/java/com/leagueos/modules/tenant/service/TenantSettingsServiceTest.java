package com.leagueos.modules.tenant.service;

import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.persistence.TenantSettingsRepository;
import com.leagueos.shared.context.TenantContext;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TenantSettingsService — Tenant-scoped settings management")
class TenantSettingsServiceTest {

    @Mock
    private TenantSettingsRepository repository;

    @InjectMocks
    private TenantSettingsService tenantSettingsService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @BeforeEach
    void setUp() {
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // =========================================================================
    // getCurrentSettings
    // =========================================================================

    @Nested
    @DisplayName("getCurrentSettings")
    class GetCurrentSettings {

        @Test
        @DisplayName("should return settings for current tenant from TenantContext")
        void returnsSettingsForCurrentTenant() {
            TenantContext.setCurrentTenant(TENANT_A);

            TenantSettings settingsA = new TenantSettings();
            settingsA.setTenantId(TENANT_A);
            settingsA.setEnableAutoSuspensions(true);
            settingsA.setMinMatchesForPlayoffs(5);

            when(repository.findByTenantId(TENANT_A)).thenReturn(Optional.of(settingsA));

            TenantSettings result = tenantSettingsService.getCurrentSettings();

            assertThat(result.getTenantId()).isEqualTo(TENANT_A);
            assertThat(result.isEnableAutoSuspensions()).isTrue();
            assertThat(result.getMinMatchesForPlayoffs()).isEqualTo(5);
        }

        @Test
        @DisplayName("ISOLATION: settings for TENANT_A should NOT return TENANT_B's data")
        void isolation_tenantA_doesNotReturnTenantBData() {
            TenantContext.setCurrentTenant(TENANT_A);

            TenantSettings settingsA = new TenantSettings();
            settingsA.setTenantId(TENANT_A);
            settingsA.setEnableAutoSuspensions(true);

            when(repository.findByTenantId(TENANT_A)).thenReturn(Optional.of(settingsA));

            TenantSettings result = tenantSettingsService.getCurrentSettings();

            assertThat(result.getTenantId())
                    .as("getCurrentSettings should return TENANT_A settings, NOT TENANT_B")
                    .isEqualTo(TENANT_A)
                    .isNotEqualTo(TENANT_B);

            // Verify the repository was ONLY queried for TENANT_A
            verify(repository).findByTenantId(TENANT_A);
            verify(repository, never()).findByTenantId(TENANT_B);
        }

        @Test
        @DisplayName("should return default settings when no settings exist for tenant")
        void returnsDefaultSettingsWhenNotFound() {
            TenantContext.setCurrentTenant(TENANT_A);

            when(repository.findByTenantId(TENANT_A)).thenReturn(Optional.empty());

            TenantSettings result = tenantSettingsService.getCurrentSettings();

            // Should return a default TenantSettings object
            assertThat(result).isNotNull();
            assertThat(result.isShowOffenseDefenseWidgets()).isTrue(); // default value
            assertThat(result.isEnableAutoSuspensions()).isFalse(); // default value
        }

        @Test
        @DisplayName("should fallback to first available settings when no tenant in context")
        void fallbackWhenNoTenantInContext() {
            // TenantContext is null (cleared in setUp)

            TenantSettings anySettings = new TenantSettings();
            anySettings.setTenantId(TENANT_A);

            when(repository.findAll()).thenReturn(List.of(anySettings));

            TenantSettings result = tenantSettingsService.getCurrentSettings();

            assertThat(result).isNotNull();
            verify(repository, never()).findByTenantId(any());
        }
    }

    // =========================================================================
    // updateMinMatchesForPlayoffs
    // =========================================================================

    @Nested
    @DisplayName("updateMinMatchesForPlayoffs")
    class UpdateMinMatchesForPlayoffs {

        @Test
        @DisplayName("should update settings for the specified tenant")
        void updatesForSpecifiedTenant() {
            TenantSettings existingSettings = new TenantSettings();
            existingSettings.setTenantId(TENANT_A);
            existingSettings.setMinMatchesForPlayoffs(0);

            when(repository.findByTenantId(TENANT_A)).thenReturn(Optional.of(existingSettings));
            when(repository.save(any(TenantSettings.class))).thenAnswer(inv -> inv.getArgument(0));

            TenantSettings result = tenantSettingsService.updateMinMatchesForPlayoffs(5, TENANT_A);

            assertThat(result.getMinMatchesForPlayoffs()).isEqualTo(5);
            verify(repository).save(argThat(settings ->
                    settings.getTenantId().equals(TENANT_A) &&
                    settings.getMinMatchesForPlayoffs() == 5
            ));
        }

        @Test
        @DisplayName("ISOLATION: updating TENANT_A settings should not query or modify TENANT_B")
        void isolation_updateDoesNotAffectOtherTenant() {
            TenantSettings settingsA = new TenantSettings();
            settingsA.setTenantId(TENANT_A);
            settingsA.setMinMatchesForPlayoffs(0);

            when(repository.findByTenantId(TENANT_A)).thenReturn(Optional.of(settingsA));
            when(repository.save(any(TenantSettings.class))).thenAnswer(inv -> inv.getArgument(0));

            tenantSettingsService.updateMinMatchesForPlayoffs(10, TENANT_A);

            verify(repository).findByTenantId(TENANT_A);
            verify(repository, never()).findByTenantId(TENANT_B);

            // Verify the saved entity is TENANT_A's, not TENANT_B's
            verify(repository).save(argThat(settings ->
                    settings.getTenantId().equals(TENANT_A)
            ));
        }

        @Test
        @DisplayName("should create new settings if none exist for tenant")
        void createsNewSettingsIfNotFound() {
            when(repository.findByTenantId(TENANT_B)).thenReturn(Optional.empty());
            when(repository.save(any(TenantSettings.class))).thenAnswer(inv -> inv.getArgument(0));

            TenantSettings result = tenantSettingsService.updateMinMatchesForPlayoffs(3, TENANT_B);

            assertThat(result.getTenantId()).isEqualTo(TENANT_B);
            assertThat(result.getMinMatchesForPlayoffs()).isEqualTo(3);
        }

        @Test
        @DisplayName("should clamp negative values to zero")
        void clampsNegativeToZero() {
            TenantSettings existing = new TenantSettings();
            existing.setTenantId(TENANT_A);

            when(repository.findByTenantId(TENANT_A)).thenReturn(Optional.of(existing));
            when(repository.save(any(TenantSettings.class))).thenAnswer(inv -> inv.getArgument(0));

            TenantSettings result = tenantSettingsService.updateMinMatchesForPlayoffs(-5, TENANT_A);

            assertThat(result.getMinMatchesForPlayoffs()).isEqualTo(0);
        }

        @Test
        @DisplayName("should throw when no tenant provided and no context set")
        void throwsWhenNoTenantAvailable() {
            TenantContext.clear();

            assertThatThrownBy(() ->
                    tenantSettingsService.updateMinMatchesForPlayoffs(5, null)
            ).isInstanceOf(IllegalStateException.class)
             .hasMessageContaining("Tenant context not found");
        }

        @Test
        @DisplayName("should use TenantContext when explicitTenantId is null")
        void usesTenantContextWhenNoExplicitId() {
            TenantContext.setCurrentTenant(TENANT_A);

            TenantSettings existing = new TenantSettings();
            existing.setTenantId(TENANT_A);

            when(repository.findByTenantId(TENANT_A)).thenReturn(Optional.of(existing));
            when(repository.save(any(TenantSettings.class))).thenAnswer(inv -> inv.getArgument(0));

            tenantSettingsService.updateMinMatchesForPlayoffs(7, null);

            verify(repository).findByTenantId(TENANT_A);
        }
    }
}
