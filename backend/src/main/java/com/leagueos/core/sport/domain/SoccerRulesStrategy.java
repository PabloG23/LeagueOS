package com.leagueos.core.sport.domain;

import org.springframework.stereotype.Component;

@Component
public class SoccerRulesStrategy implements SportRulesStrategy {

    private static final int DEFAULT_WIN_POINTS = 3;

    @Override
    public int calculateMatchPoints(MatchResult result) {
        return calculateMatchPoints(result, DEFAULT_WIN_POINTS);
    }

    @Override
    public int calculateMatchPoints(MatchResult result, int winPoints) {
        if (result.getHomeScore() == result.getAwayScore()) {
            return 1; // Draw
        }

        boolean isWin = result.isHomeTeam()
            ? result.getHomeScore() > result.getAwayScore()
            : result.getAwayScore() > result.getHomeScore();

        return isWin ? winPoints : 0;
    }

    @Override
    public boolean validateRosterSize(int size) {
        return size >= 11 && size <= 25;
    }

    @Override
    public String getSportType() {
        return "SOCCER";
    }
}
