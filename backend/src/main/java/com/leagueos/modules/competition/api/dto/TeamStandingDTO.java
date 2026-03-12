package com.leagueos.modules.competition.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamStandingDTO {
    private UUID id;
    private Integer rank;
    private String team;
    
    // Match Stats
    private int played;
    private int won;
    private int drawn;
    private int lost;
    
    // Goals
    private int goalsFor;
    private int goalsAgainst;
    private int goalDifference;
    
    // Form and Points
    private int points;
    private List<String> form;
}
