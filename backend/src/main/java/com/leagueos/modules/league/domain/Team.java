package com.leagueos.modules.league.domain;

import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Getter
@Setter
@Entity
@Table(name = "teams")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Team extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @jakarta.persistence.ManyToOne(cascade = jakarta.persistence.CascadeType.ALL)
    @jakarta.persistence.JoinColumn(name = "representative_id")
    private Person representative;

    @jakarta.persistence.Transient
    public String getRepresentativeName() {
        if (representative == null) return null;
        String first = representative.getFirstName() != null ? representative.getFirstName() : "";
        String last = representative.getLastName() != null ? representative.getLastName() : "";
        return (first + " " + last).trim();
    }

    @jakarta.persistence.Transient
    public String getRepresentativePhone() {
        return representative != null ? representative.getPhone() : null;
    }
}
