package com.leagueos.core.sport.domain;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SoccerRulesStrategyTest {

    private final SoccerRulesStrategy strategy = new SoccerRulesStrategy();

    @Test
    void calculateMatchPoints_HomeWin() {
        var result = SportRulesStrategy.MatchResult.builder()
            .homeScore(2).awayScore(1).isHomeTeam(true).build();
        assertEquals(3, strategy.calculateMatchPoints(result));
    }

    @Test
    void calculateMatchPoints_AwayWin_AsHomeTeam() {
        var result = SportRulesStrategy.MatchResult.builder()
            .homeScore(1).awayScore(2).isHomeTeam(true).build();
        assertEquals(0, strategy.calculateMatchPoints(result));
    }

    @Test
    void calculateMatchPoints_Draw() {
        var result = SportRulesStrategy.MatchResult.builder()
            .homeScore(1).awayScore(1).isHomeTeam(true).build();
        assertEquals(1, strategy.calculateMatchPoints(result));
    }

    @Test
    void validateRosterSize_Valid() {
        assertTrue(strategy.validateRosterSize(18));
    }

    @Test
    void validateRosterSize_Invalid() {
        assertFalse(strategy.validateRosterSize(5));
    }
}
