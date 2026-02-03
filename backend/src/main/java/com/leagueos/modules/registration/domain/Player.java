package com.leagueos.modules.registration.domain;

import com.leagueos.modules.league.domain.Team;
import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "profile_photo_url")
    private String profilePhotoUrl;

    @ManyToOne
    @JoinColumn(name = "team_id")
    private Team team;
}
