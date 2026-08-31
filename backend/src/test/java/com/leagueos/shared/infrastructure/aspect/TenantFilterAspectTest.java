package com.leagueos.shared.infrastructure.aspect;

import com.leagueos.shared.context.TenantContext;
import jakarta.persistence.EntityManager;
import org.hibernate.Filter;
import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TenantFilterAspect — Hibernate filter activation")
class TenantFilterAspectTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private Session session;

    @Mock
    private Filter filter;

    private TenantFilterAspect tenantFilterAspect;

    @BeforeEach
    void setUp() {
        TenantContext.clear();
        tenantFilterAspect = new TenantFilterAspect(entityManager);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("should enable Hibernate tenant filter when TenantContext has a tenant")
    void enableTenantFilter_withTenant_enablesFilter() {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant(tenantId);

        when(entityManager.unwrap(Session.class)).thenReturn(session);
        when(session.enableFilter("tenantFilter")).thenReturn(filter);

        tenantFilterAspect.enableTenantFilter();

        verify(session).enableFilter("tenantFilter");
        verify(filter).setParameter("tenantId", tenantId);
    }

    @Test
    @DisplayName("should NOT enable Hibernate tenant filter when TenantContext is empty")
    void enableTenantFilter_withoutTenant_doesNotEnableFilter() {
        // TenantContext is empty (cleared in setUp)

        tenantFilterAspect.enableTenantFilter();

        verify(entityManager, never()).unwrap(any());
    }

    @Test
    @DisplayName("ISOLATION: filter for TENANT_A should use TENANT_A's UUID, not any other")
    void enableTenantFilter_isolation_usesCorrectTenantId() {
        UUID tenantA = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID tenantB = UUID.fromString("22222222-2222-2222-2222-222222222222");

        TenantContext.setCurrentTenant(tenantA);

        when(entityManager.unwrap(Session.class)).thenReturn(session);
        when(session.enableFilter("tenantFilter")).thenReturn(filter);

        tenantFilterAspect.enableTenantFilter();

        verify(filter).setParameter("tenantId", tenantA);
        verify(filter, never()).setParameter("tenantId", tenantB);
    }
}
