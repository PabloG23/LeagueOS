package com.leagueos.modules.registration.domain;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "player_tournament_suspensions")
public class PlayerTournamentSuspension extends BaseEntity {

    @ManyToOne(optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @ManyToOne(optional = false)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(name = "remaining_matches", nullable = false)
    private int remainingMatches = 1;

    @Column(name = "total_matches_assigned", nullable = false)
    private int totalMatchesAssigned = 1;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "is_tournament_banned", nullable = false)
    private boolean isTournamentBanned = false;
}
