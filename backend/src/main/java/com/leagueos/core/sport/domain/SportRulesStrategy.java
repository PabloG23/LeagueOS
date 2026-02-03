package com.leagueos.core.sport.domain;

import lombok.Builder;
import lombok.Getter;

public interface SportRulesStrategy {

    int calculateMatchPoints(MatchResult result);

    boolean validateRosterSize(int size);

    String getSportType();

    @Getter
    @Builder
    class MatchResult {
        private final int homeScore;
        private final int awayScore;
        private final boolean isHomeTeam;
    }
}
