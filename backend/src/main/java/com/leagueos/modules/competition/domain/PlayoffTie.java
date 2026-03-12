package com.leagueos.modules.competition.domain;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Getter
@Setter
@Entity
@Table(name = "playoff_ties")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PlayoffTie extends BaseEntity {

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "round")
    private PlayoffRound round;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_seed_team_id")
    private Team homeSeedTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "away_seed_team_id")
    private Team awaySeedTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "advancing_team_id")
    private Team advancingTeam;

    @Column(name = "next_tie_id")
    private UUID nextTieId;
}
