package com.leagueos.modules.league.domain;

import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tenants")
public class Tenant extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "sport_type", nullable = false)
    private String sportType;

    @Column(unique = true, nullable = false)
    private String subdomain;
}
