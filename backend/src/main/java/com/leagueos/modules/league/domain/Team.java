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
@Table(name = "teams")
public class Team extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "logo_url")
    private String logoUrl;

    @jakarta.persistence.ManyToOne
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
