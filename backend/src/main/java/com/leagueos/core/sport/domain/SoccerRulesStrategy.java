package com.leagueos.core.sport.domain;

import org.springframework.stereotype.Component;

@Component
public class SoccerRulesStrategy implements SportRulesStrategy {

    @Override
    public int calculateMatchPoints(MatchResult result) {
        if (result.getHomeScore() == result.getAwayScore()) {
            return 1; // Draw
        }
        
        boolean isWin = result.isHomeTeam() 
            ? result.getHomeScore() > result.getAwayScore()
            : result.getAwayScore() > result.getHomeScore();
            
        return isWin ? 3 : 0;
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
