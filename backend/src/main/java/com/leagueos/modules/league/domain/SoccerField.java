package com.leagueos.modules.league.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "soccer_fields")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SoccerField extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "location_url", columnDefinition = "TEXT")
    private String locationUrl;

    @Column(name = "address", length = 255)
    private String address;
}
