package com.leagueos.core.sport.domain;

import lombok.Builder;
import lombok.Getter;

public interface SportRulesStrategy {

    int calculateMatchPoints(MatchResult result);

    /**
     * Calculates match points using a tenant-configurable win point value.
     * Implementations should override this to use the provided winPoints parameter.
     * The default implementation delegates to calculateMatchPoints(result) for backwards compatibility.
     */
    default int calculateMatchPoints(MatchResult result, int winPoints) {
        return calculateMatchPoints(result);
    }

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
