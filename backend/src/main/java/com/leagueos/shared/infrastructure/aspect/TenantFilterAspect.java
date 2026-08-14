package com.leagueos.shared.infrastructure.aspect;

import com.leagueos.shared.context.TenantContext;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class TenantFilterAspect {

    private final EntityManager entityManager;

    /**
     * Enable the Hibernate tenant filter on every repository/service call,
     * EXCEPT for TenantRepository (which is global, cross-tenant data).
     */
    @Before("(execution(* com.leagueos..*Repository.*(..)) || execution(* com.leagueos..*Service.*(..)))" +
            " && !within(com.leagueos.modules.league.persistence.TenantRepository+)")
    public void enableTenantFilter() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null) {
            log.debug("TenantFilterAspect: enabling filter for tenant {}", tenantId);
            Session session = entityManager.unwrap(Session.class);
            session.enableFilter("tenantFilter").setParameter("tenantId", tenantId);
        } else {
            log.debug("TenantFilterAspect: no tenant in context, filter NOT enabled");
        }
    }
}
