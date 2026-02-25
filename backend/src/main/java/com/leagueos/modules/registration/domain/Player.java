package com.leagueos.modules.registration.domain;

import com.leagueos.modules.league.domain.Team;
import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "players")
public class Player extends BaseEntity {

    @ManyToOne(optional = false)
    @JoinColumn(name = "person_id")
    private com.leagueos.modules.league.domain.Person person;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlayerStatus status;

    @ManyToOne
    @JoinColumn(name = "team_id")
    private Team team;

    @Column(name = "suspended_until_matchday")
    private Integer suspendedUntilMatchday;

    @jakarta.persistence.Transient
    public String getFirstName() {
        return person != null ? person.getFirstName() : null;
    }

    @jakarta.persistence.Transient
    public String getLastName() {
        return person != null ? person.getLastName() : null;
    }

    @jakarta.persistence.Transient
    public String getProfilePhotoUrl() {
        return person != null ? person.getProfilePhotoUrl() : null;
    }

    @jakarta.persistence.Transient
    public LocalDate getBirthDate() {
        return person != null ? person.getBirthDate() : null;
    }
}
