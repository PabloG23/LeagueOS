package com.leagueos.modules.competition.api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MatchResultSummaryDTO {
    private UUID homeTeamId;
    private String homeTeamName;
    private UUID awayTeamId;
    private String awayTeamName;
    private Integer homeScore;
    private Integer awayScore;
    private LocalDateTime matchDate;
    private Boolean isDoubleForfeit;
}
