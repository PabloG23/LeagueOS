package com.leagueos.modules.competition.domain;

import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "match_events")
public class MatchEvent extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne
    @JoinColumn(name = "player_id") // Optional for some events? Requirement says "Player player"
    private Player player;

    @ManyToOne
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private MatchEventType eventType;

    @Column(name = "suspension_matchdays")
    private Integer suspensionMatchdays;

    public enum MatchEventType {
        GOAL, YELLOW_CARD, RED_CARD, APPEARANCE
    }
}
