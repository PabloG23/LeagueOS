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
public class PlayerProfileStatsDTO {
    private UUID playerId;
    
    // Core stats
    private int matchesPlayed;
    private int goals;
    private int yellowCards;
    private int redCards;
    private Integer suspendedUntilMatchday;
}
