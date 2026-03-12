package com.leagueos.modules.competition.domain;

import com.leagueos.modules.league.domain.Season;
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

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "matches")
public class Match extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToOne
    @JoinColumn(name = "home_team_id", nullable = false)
    private Team homeTeam;

    @ManyToOne
    @JoinColumn(name = "away_team_id", nullable = false)
    private Team awayTeam;

    @Column(name = "match_date")
    private LocalDateTime matchDate;

    @Column(name = "location")
    private String location;

    @Column(name = "matchday")
    private Integer matchday;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status = MatchStatus.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "stage")
    private MatchStage stage = MatchStage.REGULAR;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "playoff_tie_id")
    private PlayoffTie playoffTie;

    @Column(name = "leg_number")
    private Integer legNumber;

    @Column(name = "is_tiebreaker_required")
    private Boolean isTiebreakerRequired = false;

    public enum MatchStatus {
        SCHEDULED, IN_PROGRESS, FINISHED, CANCELLED
    }
}
