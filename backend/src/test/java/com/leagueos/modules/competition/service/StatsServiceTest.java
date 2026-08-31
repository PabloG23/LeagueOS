package com.leagueos.modules.competition.service;

import com.leagueos.core.sport.domain.SoccerRulesStrategy;
import com.leagueos.core.sport.domain.SportRulesService;
import com.leagueos.modules.competition.api.dto.MatchResultSummaryDTO;
import com.leagueos.modules.competition.api.dto.PlayerProfileStatsDTO;
import com.leagueos.modules.competition.api.dto.PlayerScorerDTO;
import com.leagueos.modules.competition.api.dto.TeamStandingDTO;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.media.service.StorageService;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StatsService — Standings calculation, Top Scorers & Discipline Stats")
class StatsServiceTest {

    @Mock private MatchEventRepository matchEventRepository;
    @Mock private MatchRepository matchRepository;
    @Mock private TeamRegistrationRepository teamRegistrationRepository;
    @Mock private TenantSettingsService tenantSettingsService;
    @Mock private SportRulesService sportRulesService;
    @Mock private StorageService storageService;

    @InjectMocks
    private StatsService statsService;

    private UUID seasonId;
    private Team teamA;
    private Team teamB;
    private Team teamC;

    @BeforeEach
    void setUp() {
        seasonId = UUID.randomUUID();

        teamA = new Team();
        teamA.setId(UUID.randomUUID());
        teamA.setName("Atlas");

        teamB = new Team();
        teamB.setId(UUID.randomUUID());
        teamB.setName("Pumas");

        teamC = new Team();
        teamC.setId(UUID.randomUUID());
        teamC.setName("Cruz Azul");
    }

    private TeamRegistration createRegistration(Team team) {
        TeamRegistration reg = new TeamRegistration();
        reg.setId(UUID.randomUUID());
        reg.setTeam(team);
        reg.setStatus(TeamRegistration.RegistrationStatus.APPROVED);
        return reg;
    }

    // =========================================================================
    // calculateStandings
    // =========================================================================

    @Nested
    @DisplayName("calculateStandings")
    class CalculateStandings {

        @Test
        @DisplayName("should accurately calculate points, goals, GD and rank teams")
        void calculatesPointsAndRankingsCorrectly() {
            List<TeamRegistration> registrations = List.of(
                    createRegistration(teamA),
                    createRegistration(teamB),
                    createRegistration(teamC)
            );

            when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                    .thenReturn(registrations);
            when(matchRepository.findBySeasonId(seasonId)).thenReturn(Collections.emptyList());

            // Match 1: Atlas 3 - 1 Pumas (Atlas wins: 3 pts, Pumas: 0 pts)
            MatchResultSummaryDTO m1 = new MatchResultSummaryDTO(
                    teamA.getId(), "Atlas", teamB.getId(), "Pumas",
                    3, 1, LocalDateTime.now(), false
            );

            // Match 2: Cruz Azul 2 - 2 Atlas (Draw: Cruz Azul 1 pt, Atlas 1 pt)
            MatchResultSummaryDTO m2 = new MatchResultSummaryDTO(
                    teamC.getId(), "Cruz Azul", teamA.getId(), "Atlas",
                    2, 2, LocalDateTime.now(), false
            );

            when(matchRepository.findFinishedMatchSummariesBySeasonId(seasonId)).thenReturn(List.of(m1, m2));

            TenantSettings settings = new TenantSettings();
            settings.setWinPointsOnWin(3);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(settings);
            when(sportRulesService.getStrategy("SOCCER")).thenReturn(Optional.of(new SoccerRulesStrategy()));

            List<TeamStandingDTO> standings = statsService.calculateStandings(seasonId);

            assertThat(standings).hasSize(3);

            // Rank 1: Atlas (4 pts, 1W 1D 0L, GF: 5, GA: 3, GD: +2)
            TeamStandingDTO rank1 = standings.get(0);
            assertThat(rank1.getTeam()).isEqualTo("Atlas");
            assertThat(rank1.getPoints()).isEqualTo(4);
            assertThat(rank1.getWon()).isEqualTo(1);
            assertThat(rank1.getDrawn()).isEqualTo(1);
            assertThat(rank1.getLost()).isEqualTo(0);
            assertThat(rank1.getGoalsFor()).isEqualTo(5);
            assertThat(rank1.getGoalsAgainst()).isEqualTo(3);
            assertThat(rank1.getGoalDifference()).isEqualTo(2);
            assertThat(rank1.getRank()).isEqualTo(1);

            // Rank 2: Cruz Azul (1 pt, 0W 1D 0L, GF: 2, GA: 2, GD: 0)
            TeamStandingDTO rank2 = standings.get(1);
            assertThat(rank2.getTeam()).isEqualTo("Cruz Azul");
            assertThat(rank2.getPoints()).isEqualTo(1);
            assertThat(rank2.getRank()).isEqualTo(2);

            // Rank 3: Pumas (0 pts, 0W 0D 1L, GF: 1, GA: 3, GD: -2)
            TeamStandingDTO rank3 = standings.get(2);
            assertThat(rank3.getTeam()).isEqualTo("Pumas");
            assertThat(rank3.getPoints()).isEqualTo(0);
            assertThat(rank3.getRank()).isEqualTo(3);
        }

        @Test
        @DisplayName("should handle double forfeit by awarding 0 points and a loss to both teams")
        void handlesDoubleForfeitInStandings() {
            List<TeamRegistration> registrations = List.of(
                    createRegistration(teamA),
                    createRegistration(teamB)
            );

            when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                    .thenReturn(registrations);
            when(matchRepository.findBySeasonId(seasonId)).thenReturn(Collections.emptyList());

            MatchResultSummaryDTO dfMatch = new MatchResultSummaryDTO(
                    teamA.getId(), "Atlas", teamB.getId(), "Pumas",
                    0, 0, LocalDateTime.now(), true
            );

            when(matchRepository.findFinishedMatchSummariesBySeasonId(seasonId)).thenReturn(List.of(dfMatch));

            TenantSettings settings = new TenantSettings();
            settings.setWinPointsOnWin(3);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(settings);
            when(sportRulesService.getStrategy("SOCCER")).thenReturn(Optional.of(new SoccerRulesStrategy()));

            List<TeamStandingDTO> standings = statsService.calculateStandings(seasonId);

            assertThat(standings).hasSize(2);
            for (TeamStandingDTO standing : standings) {
                assertThat(standing.getPoints()).isEqualTo(0);
                assertThat(standing.getLost()).isEqualTo(1);
                assertThat(standing.getForm()).containsExactly("L");
            }
        }
    }

    // =========================================================================
    // getTopScorersForSeason
    // =========================================================================

    @Nested
    @DisplayName("getTopScorersForSeason")
    class TopScorers {

        @Test
        @DisplayName("should assign ranks and signed photos to scorers")
        void returnsRankedScorersWithSignedUrls() {
            PlayerScorerDTO scorer1 = PlayerScorerDTO.builder()
                    .id(UUID.randomUUID())
                    .name("Gignac")
                    .team("Tigres")
                    .teamId(UUID.randomUUID())
                    .goals(10L)
                    .profilePhotoUrl("players/gignac.jpg")
                    .build();

            PlayerScorerDTO scorer2 = PlayerScorerDTO.builder()
                    .id(UUID.randomUUID())
                    .name("Henry Martín")
                    .team("América")
                    .teamId(UUID.randomUUID())
                    .goals(8L)
                    .profilePhotoUrl(null)
                    .build();

            when(matchEventRepository.countGoalsByPlayerForSeason(List.of(seasonId)))
                    .thenReturn(List.of(scorer1, scorer2));
            when(storageService.getSignedUrl(eq("players/gignac.jpg"), anyInt()))
                    .thenReturn("https://s3.amazonaws.com/players/gignac-signed.jpg");

            List<PlayerScorerDTO> result = statsService.getTopScorersForSeason(List.of(seasonId));

            assertThat(result).hasSize(2);
            assertThat(result.get(0).getRank()).isEqualTo(1);
            assertThat(result.get(0).getProfilePhotoUrl()).isEqualTo("https://s3.amazonaws.com/players/gignac-signed.jpg");
            assertThat(result.get(1).getRank()).isEqualTo(2);
        }
    }

    // =========================================================================
    // getPlayerProfileStats
    // =========================================================================

    @Nested
    @DisplayName("getPlayerProfileStats")
    class PlayerProfileStats {

        @Test
        @DisplayName("should aggregate goals, cards, and matches played for player profile")
        void aggregatesPlayerStats() {
            UUID playerId = UUID.randomUUID();

            when(matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.GOAL)).thenReturn(5);
            when(matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.YELLOW_CARD)).thenReturn(2);
            when(matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.RED_CARD)).thenReturn(1);
            when(matchEventRepository.countMatchesByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.APPEARANCE)).thenReturn(8);

            PlayerProfileStatsDTO stats = statsService.getPlayerProfileStats(playerId);

            assertThat(stats.getPlayerId()).isEqualTo(playerId);
            assertThat(stats.getGoals()).isEqualTo(5);
            assertThat(stats.getYellowCards()).isEqualTo(2);
            assertThat(stats.getRedCards()).isEqualTo(1);
            assertThat(stats.getMatchesPlayed()).isEqualTo(8);
        }
    }
}
