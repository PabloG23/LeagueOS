package com.leagueos.modules.league.domain;

import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

@Getter
@Setter
@Entity
@Table(name = "seasons")
public class Season extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "division_id")
    private Division division;

    @Column(nullable = false)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private SeasonStatus status = SeasonStatus.DRAFT;

    @Column(name = "current_matchday", nullable = false)
    private Integer currentMatchday = 1;

    @Column(name = "max_active_players_per_team", nullable = false)
    private int maxActivePlayersPerTeam = 26;
}
