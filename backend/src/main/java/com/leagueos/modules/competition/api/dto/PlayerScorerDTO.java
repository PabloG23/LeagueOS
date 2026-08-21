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
public class PlayerScorerDTO {
    private UUID id;
    private String name;
    private String team;
    private UUID teamId;
    private Long goals;
    private Integer rank;
    private String profilePhotoUrl;

    public PlayerScorerDTO(UUID id, String name, String team, UUID teamId, Long goals, String profilePhotoUrl) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.teamId = teamId;
        this.goals = goals;
        this.rank = 0;
        this.profilePhotoUrl = profilePhotoUrl;
    }
}
