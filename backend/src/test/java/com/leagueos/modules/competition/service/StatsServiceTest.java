package com.leagueos.modules.competition.service;

import com.leagueos.core.sport.domain.SoccerRulesStrategy;
import com.leagueos.core.sport.domain.SportRulesService;
import com.leagueos.modules.competition.api.dto.MatchResultSummaryDTO;
import com.leagueos.modules.competition.api.dto.PlayerProfileStatsDTO;
import com.leagueos.modules.competition.api.dto.PlayerScorerDTO;
import com.leagueos.modules.competition.api.dto.PlayerStatDTO;
import com.leagueos.modules.competition.api.dto.TeamStandingDTO;
import com.leagueos.modules.competition.api.dto.TeamStatDTO;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
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
        teamA.setLogoUrl("atlas.png");

        teamB = new Team();
        teamB.setId(UUID.randomUUID());
        teamB.setName("Pumas");
        teamB.setLogoUrl("http://external.com/pumas.png");

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
            when(storageService.getSignedUrl("atlas.png", 120)).thenReturn("https://signed.com/atlas.png");

            // Match 1: Atlas 3 - 1 Pumas (Atlas wins)
            MatchResultSummaryDTO m1 = new MatchResultSummaryDTO(
                    teamA.getId(), "Atlas", teamB.getId(), "Pumas",
                    3, 1, LocalDateTime.now(), false
            );

            // Match 2: Cruz Azul 2 - 2 Atlas (Draw)
            MatchResultSummaryDTO m2 = new MatchResultSummaryDTO(
                    teamC.getId(), "Cruz Azul", teamA.getId(), "Atlas",
                    2, 2, LocalDateTime.now(), false
            );

            // Match 3: Pumas 0 - 2 Cruz Azul (Away win for Cruz Azul)
            MatchResultSummaryDTO m3 = new MatchResultSummaryDTO(
                    teamB.getId(), "Pumas", teamC.getId(), "Cruz Azul",
                    0, 2, LocalDateTime.now(), false
            );

            when(matchRepository.findFinishedMatchSummariesBySeasonId(seasonId)).thenReturn(List.of(m1, m2, m3));

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
            assertThat(rank1.getSignedLogoUrl()).isEqualTo("https://signed.com/atlas.png");

            // Rank 2: Cruz Azul (4 pts, 1W 1D 0L, GF: 4, GA: 2, GD: +2)
            TeamStandingDTO rank2 = standings.get(1);
            assertThat(rank2.getTeam()).isEqualTo("Cruz Azul");
            assertThat(rank2.getPoints()).isEqualTo(4);

            // Rank 3: Pumas (0 pts)
            TeamStandingDTO rank3 = standings.get(2);
            assertThat(rank3.getTeam()).isEqualTo("Pumas");
            assertThat(rank3.getSignedLogoUrl()).isEqualTo("http://external.com/pumas.png");
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
    // getTopScorersForSeason & Discipline
    // =========================================================================

    @Nested
    @DisplayName("getTopScorersForSeason & Discipline")
    class TopScorersAndDiscipline {

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

        @Test
        @DisplayName("should return ranked player red cards for season and matchday")
        void returnsRankedRedCards() {
            PlayerStatDTO p1 = PlayerStatDTO.builder().id(UUID.randomUUID()).name("Ramos").redCards(3L).build();
            PlayerStatDTO p2 = PlayerStatDTO.builder().id(UUID.randomUUID()).name("Pepe").redCards(2L).build();

            when(matchEventRepository.countRedCardsByPlayerForSeason(List.of(seasonId)))
                    .thenReturn(List.of(p1, p2));
            when(matchEventRepository.countRedCardsByPlayerForMatchday(List.of(seasonId), 5))
                    .thenReturn(List.of(p1));

            List<PlayerStatDTO> seasonCards = statsService.getTopRedCardsByPlayerForSeason(List.of(seasonId));
            assertThat(seasonCards).hasSize(2);
            assertThat(seasonCards.get(0).getRank()).isEqualTo(1);

            List<PlayerStatDTO> matchdayCards = statsService.getTopRedCardsByPlayerForMatchday(List.of(seasonId), 5);
            assertThat(matchdayCards).hasSize(1);
            assertThat(matchdayCards.get(0).getRank()).isEqualTo(1);

            // Null matchday returns empty
            List<PlayerStatDTO> nullMatchday = statsService.getTopRedCardsByPlayerForMatchday(List.of(seasonId), null);
            assertThat(nullMatchday).isEmpty();
        }

        @Test
        @DisplayName("should return ranked team red cards for season")
        void returnsRankedTeamRedCards() {
            TeamStatDTO t1 = TeamStatDTO.builder().id(teamA.getId()).name("Atlas").redCards(5L).build();
            when(matchEventRepository.countRedCardsByTeamForSeason(List.of(seasonId))).thenReturn(List.of(t1));

            List<TeamStatDTO> teamStats = statsService.getTopRedCardsByTeamForSeason(List.of(seasonId));
            assertThat(teamStats).hasSize(1);
            assertThat(teamStats.get(0).getRank()).isEqualTo(1);
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

        @Test
        @DisplayName("should fallback to countDistinctMatchesByPlayerId when APPEARANCE count is 0")
        void fallbacksToDistinctMatchesWhenAppearancesZero() {
            UUID playerId = UUID.randomUUID();

            when(matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.GOAL)).thenReturn(3);
            when(matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.YELLOW_CARD)).thenReturn(1);
            when(matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.RED_CARD)).thenReturn(0);
            when(matchEventRepository.countMatchesByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.APPEARANCE)).thenReturn(0);
            when(matchEventRepository.countDistinctMatchesByPlayerId(playerId)).thenReturn(4);

            PlayerProfileStatsDTO stats = statsService.getPlayerProfileStats(playerId);

            assertThat(stats.getMatchesPlayed()).isEqualTo(4);
        }
    }
}
