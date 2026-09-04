package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.UpdateMatchScoreRequest;
import com.leagueos.modules.competition.api.dto.UpdateMatchScheduleRequest;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.domain.PlayoffTie;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.SoccerField;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.SoccerFieldRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.referee.domain.Referee;
import com.leagueos.modules.referee.persistence.RefereeRepository;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchService — Business logic & tenant isolation")
class MatchServiceTest {

    @Mock private MatchRepository matchRepository;
    @Mock private MatchEventRepository matchEventRepository;
    @Mock private PlayerRepository playerRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private TenantSettingsService tenantSettingsService;
    @Mock private PlayoffService playoffService;
    @Mock private SoccerFieldRepository soccerFieldRepository;
    @Mock private RefereeRepository refereeRepository;

    @InjectMocks
    private MatchService matchService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private UUID matchId;
    private Match match;
    private Team homeTeam;
    private Team awayTeam;

    @BeforeEach
    void setUp() {
        TenantContext.clear();

        matchId = UUID.randomUUID();
        homeTeam = createTeam("Home Team");
        awayTeam = createTeam("Away Team");

        match = new Match();
        match.setId(matchId);
        match.setTenantId(TENANT_A);
        match.setHomeTeam(homeTeam);
        match.setAwayTeam(awayTeam);
        match.setStatus(Match.MatchStatus.SCHEDULED);
        match.setStage(MatchStage.REGULAR);
        match.setMatchday(3);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // =========================================================================
    // submitMatchReport
    // =========================================================================

    @Nested
    @DisplayName("submitMatchReport")
    class SubmitMatchReport {

        @Test
        @DisplayName("should calculate home and away goals correctly from GOAL events")
        void calculatesGoalsCorrectly() {
            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(new TenantSettings());
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));
            // Mock teamRepository so buildMatchEvent resolves teams correctly
            when(teamRepository.findById(homeTeam.getId())).thenReturn(Optional.of(homeTeam));
            when(teamRepository.findById(awayTeam.getId())).thenReturn(Optional.of(awayTeam));

            MatchEvent homeGoal1 = createGoalEvent(homeTeam, null);
            MatchEvent homeGoal2 = createGoalEvent(homeTeam, null);
            MatchEvent awayGoal = createGoalEvent(awayTeam, null);

            matchService.submitMatchReport(matchId, List.of(homeGoal1, homeGoal2, awayGoal));

            verify(matchRepository).save(argThat(savedMatch -> {
                assertThat(savedMatch.getHomeScore()).isEqualTo(2);
                assertThat(savedMatch.getAwayScore()).isEqualTo(1);
                assertThat(savedMatch.getStatus()).isEqualTo(Match.MatchStatus.FINISHED);
                return true;
            }));
        }

        @Test
        @DisplayName("should handle double forfeit correctly")
        void handlesDoubleForfeit() {
            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(new TenantSettings());
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            MatchEvent doubleForfeit = new MatchEvent();
            doubleForfeit.setEventType(MatchEvent.MatchEventType.DOUBLE_FORFEIT);

            matchService.submitMatchReport(matchId, List.of(doubleForfeit));

            verify(matchRepository).save(argThat(savedMatch -> {
                assertThat(savedMatch.getIsDoubleForfeit()).isTrue();
                assertThat(savedMatch.getHomeScore()).isEqualTo(0);
                assertThat(savedMatch.getAwayScore()).isEqualTo(0);
                return true;
            }));
        }

        @Test
        @DisplayName("should apply auto-suspension on red card events")
        void appliesAutoSuspensionOnRedCard() {
            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(new TenantSettings());
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            Player player = createPlayer();
            UUID playerId = player.getId();

            when(playerRepository.findById(playerId)).thenReturn(Optional.of(player));
            when(teamRepository.findById(homeTeam.getId())).thenReturn(Optional.of(homeTeam));

            MatchEvent redCard = new MatchEvent();
            redCard.setEventType(MatchEvent.MatchEventType.RED_CARD);
            redCard.setPlayer(player);
            redCard.setTeam(homeTeam);
            redCard.setSuspensionMatchdays(2);

            matchService.submitMatchReport(matchId, List.of(redCard));

            // matchday is 3, suspension is 2 → suspended until matchday 5
            verify(playerRepository).save(argThat(savedPlayer -> {
                assertThat(savedPlayer.getSuspendedUntilMatchday()).isEqualTo(5);
                return true;
            }));
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when match not found")
        void throwsWhenMatchNotFound() {
            when(matchRepository.findById(matchId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> matchService.submitMatchReport(matchId, List.of()))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining(matchId.toString());
        }

        @Test
        @DisplayName("should handle null events list gracefully")
        void handlesNullEvents() {
            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(new TenantSettings());
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            matchService.submitMatchReport(matchId, null);

            verify(matchRepository).save(argThat(savedMatch -> {
                assertThat(savedMatch.getHomeScore()).isEqualTo(0);
                assertThat(savedMatch.getAwayScore()).isEqualTo(0);
                assertThat(savedMatch.getStatus()).isEqualTo(Match.MatchStatus.FINISHED);
                return true;
            }));
        }

        @Test
        @DisplayName("should resolve playoff tie when match is in PLAYOFFS stage")
        void resolvesPlayoffTie() {
            UUID tieId = UUID.randomUUID();
            PlayoffTie tie = new PlayoffTie();
            tie.setId(tieId);

            match.setStage(MatchStage.PLAYOFFS);
            match.setPlayoffTie(tie);

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(new TenantSettings());
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            matchService.submitMatchReport(matchId, List.of());

            verify(playoffService).resolveTie(tieId);
        }

        @Test
        @DisplayName("should NOT resolve playoff tie for REGULAR stage matches")
        void doesNotResolvePlayoffForRegularMatches() {
            match.setStage(MatchStage.REGULAR);

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(new TenantSettings());
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            matchService.submitMatchReport(matchId, List.of());

            verify(playoffService, never()).resolveTie(any());
        }
    }

    // =========================================================================
    // updateMatchScore — TENANT ISOLATION
    // =========================================================================

    @Nested
    @DisplayName("updateMatchScore — Tenant Isolation")
    class UpdateMatchScore {

        @Test
        @DisplayName("ISOLATION: should reject update when match belongs to TENANT_A but context is TENANT_B")
        void rejectsUpdateForDifferentTenant() {
            TenantContext.setCurrentTenant(TENANT_B); // Current context is TENANT_B
            match.setTenantId(TENANT_A); // Match belongs to TENANT_A

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));

            UpdateMatchScoreRequest request = new UpdateMatchScoreRequest();
            request.setHomeScore(2);
            request.setAwayScore(1);

            assertThatThrownBy(() -> matchService.updateMatchScore(matchId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("does not belong to the current tenant");
        }

        @Test
        @DisplayName("should allow update when match tenant matches context tenant")
        void allowsUpdateForCorrectTenant() {
            TenantContext.setCurrentTenant(TENANT_A);
            match.setTenantId(TENANT_A);

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateMatchScoreRequest request = new UpdateMatchScoreRequest();
            request.setHomeScore(3);
            request.setAwayScore(0);

            Match result = matchService.updateMatchScore(matchId, request);

            assertThat(result.getHomeScore()).isEqualTo(3);
            assertThat(result.getAwayScore()).isEqualTo(0);
            assertThat(result.getStatus()).isEqualTo(Match.MatchStatus.FINISHED);
        }

        @Test
        @DisplayName("should only update provided fields (partial update)")
        void partialUpdate() {
            TenantContext.setCurrentTenant(TENANT_A);
            match.setTenantId(TENANT_A);
            match.setHomeScore(0);
            match.setAwayScore(0);

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateMatchScoreRequest request = new UpdateMatchScoreRequest();
            request.setHomeScore(2); // only update home score
            // awayScore is null → should NOT be overwritten

            Match result = matchService.updateMatchScore(matchId, request);

            assertThat(result.getHomeScore()).isEqualTo(2);
            assertThat(result.getAwayScore()).isEqualTo(0); // unchanged
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when match does not exist")
        void throwsWhenMatchNotFound() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(matchRepository.findById(matchId)).thenReturn(Optional.empty());

            UpdateMatchScoreRequest request = new UpdateMatchScoreRequest();
            request.setHomeScore(1);

            assertThatThrownBy(() -> matchService.updateMatchScore(matchId, request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =========================================================================
    // updateMatchSchedule — TENANT ISOLATION
    // =========================================================================

    @Nested
    @DisplayName("updateMatchSchedule — Tenant Isolation")
    class UpdateMatchSchedule {

        @Test
        @DisplayName("ISOLATION: should reject schedule update when match belongs to different tenant")
        void rejectsScheduleUpdateForDifferentTenant() {
            TenantContext.setCurrentTenant(TENANT_B);
            match.setTenantId(TENANT_A);

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));

            UpdateMatchScheduleRequest request = new UpdateMatchScheduleRequest();
            request.setMatchDate(LocalDateTime.now().plusDays(7));

            assertThatThrownBy(() -> matchService.updateMatchSchedule(matchId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("does not belong to the current tenant");
        }

        @Test
        @DisplayName("should update schedule with field from same tenant")
        void updatesScheduleWithFieldFromSameTenant() {
            TenantContext.setCurrentTenant(TENANT_A);
            match.setTenantId(TENANT_A);

            UUID fieldId = UUID.randomUUID();
            SoccerField field = new SoccerField();
            field.setId(fieldId);
            field.setName("Campo Principal");
            field.setTenantId(TENANT_A);

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(soccerFieldRepository.findByIdAndTenantId(fieldId, TENANT_A))
                    .thenReturn(Optional.of(field));
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateMatchScheduleRequest request = new UpdateMatchScheduleRequest();
            request.setMatchDate(LocalDateTime.of(2026, 9, 15, 10, 0));
            request.setFieldId(fieldId);

            Match result = matchService.updateMatchSchedule(matchId, request);

            assertThat(result.getField()).isEqualTo(field);
            assertThat(result.getLocation()).isEqualTo("Campo Principal");
        }

        @Test
        @DisplayName("should assign referee from same tenant")
        void assignsRefereeFromSameTenant() {
            TenantContext.setCurrentTenant(TENANT_A);
            match.setTenantId(TENANT_A);

            UUID refereeId = UUID.randomUUID();
            Referee referee = new Referee();
            referee.setId(refereeId);
            referee.setTenantId(TENANT_A);

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A))
                    .thenReturn(Optional.of(referee));
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateMatchScheduleRequest request = new UpdateMatchScheduleRequest();
            request.setMatchDate(LocalDateTime.now());
            request.setRefereeId(refereeId);

            Match result = matchService.updateMatchSchedule(matchId, request);

            assertThat(result.getReferee()).isEqualTo(referee);
        }

        @Test
        @DisplayName("should fallback to request location and null referee when not found in tenant")
        void fallsBackWhenFieldOrRefereeNotFound() {
            TenantContext.setCurrentTenant(TENANT_A);
            match.setTenantId(TENANT_A);

            UUID fieldId = UUID.randomUUID();
            UUID refereeId = UUID.randomUUID();

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(soccerFieldRepository.findByIdAndTenantId(fieldId, TENANT_A)).thenReturn(Optional.empty());
            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.empty());
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateMatchScheduleRequest request = new UpdateMatchScheduleRequest();
            request.setLocation("Cancha Externa");
            request.setFieldId(fieldId);
            request.setRefereeId(refereeId);

            Match result = matchService.updateMatchSchedule(matchId, request);

            assertThat(result.getLocation()).isEqualTo("Cancha Externa");
            assertThat(result.getField()).isNull();
            assertThat(result.getReferee()).isNull();
        }

        @Test
        @DisplayName("getMatchesByMatchday should return matches from repository")
        void getsMatchesByMatchday() {
            when(matchRepository.findByMatchday(3)).thenReturn(List.of(match));
            List<Match> matches = matchService.getMatchesByMatchday(3);
            assertThat(matches).hasSize(1);
        }

        @Test
        @DisplayName("getMatchEvents should return events from repository")
        void getsMatchEvents() {
            MatchEvent event = new MatchEvent();
            when(matchEventRepository.findByMatchId(matchId)).thenReturn(List.of(event));
            List<MatchEvent> events = matchService.getMatchEvents(matchId);
            assertThat(events).hasSize(1);
        }
    }

    // =========================================================================
    // Helper methods
    // =========================================================================

    private Team createTeam(String name) {
        Team team = new Team();
        team.setId(UUID.randomUUID());
        team.setName(name);
        team.setTenantId(TENANT_A);
        return team;
    }

    private Player createPlayer() {
        Player player = new Player();
        player.setId(UUID.randomUUID());
        player.setTenantId(TENANT_A);
        return player;
    }

    private MatchEvent createGoalEvent(Team team, Player player) {
        MatchEvent event = new MatchEvent();
        event.setEventType(MatchEvent.MatchEventType.GOAL);
        event.setTeam(team);
        event.setPlayer(player);
        return event;
    }
}
