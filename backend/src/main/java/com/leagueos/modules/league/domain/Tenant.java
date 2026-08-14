package com.leagueos.modules.league.domain;

import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

/**
 * Tenant is global, cross-tenant system data.
 * We override the inherited BaseEntity @Filter with a no-op condition (1=1)
 * so that the Hibernate tenant filter never restricts this table.
 */
@Getter
@Setter
@Entity
@Table(name = "tenants")
@Filter(name = "tenantFilter", condition = "1=1")
public class Tenant extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "sport_type", nullable = false)
    private String sportType;

    @Column(unique = true, nullable = false)
    private String subdomain;
}
