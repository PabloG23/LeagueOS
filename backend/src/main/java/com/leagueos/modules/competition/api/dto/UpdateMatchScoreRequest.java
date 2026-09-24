package com.leagueos.modules.competition.api.dto;

import com.leagueos.modules.competition.domain.Match;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateMatchScoreRequest {
    private Integer homeScore;
    private Integer awayScore;
    private Match.MatchStatus status;
    private Boolean isDoubleForfeit;
    private Integer homePenaltyScore;
    private Integer awayPenaltyScore;
    private UUID penaltyWinnerTeamId;
    private Boolean clearPenaltyWinner;
}
