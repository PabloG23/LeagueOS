package com.leagueos.modules.competition.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlayerStatDTO {
    private UUID id;
    private String name;
    private String team;
    private UUID teamId;
    private Long redCards;
    private Integer rank;
    private String notes;

    // Default constructor for queries without notes
    public PlayerStatDTO(UUID id, String name, String team, UUID teamId, Long redCards, Integer rank) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.teamId = teamId;
        this.redCards = redCards;
        this.rank = rank;
    }
}
