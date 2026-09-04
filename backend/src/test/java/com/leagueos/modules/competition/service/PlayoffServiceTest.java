package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.domain.PlayoffRound;
import com.leagueos.modules.competition.domain.PlayoffTie;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.competition.persistence.PlayoffTieRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PlayoffService — Playoff Bracket Generation, Resolution & Tenant Isolation")
class PlayoffServiceTest {

    @Mock private PlayoffTieRepository playoffTieRepository;
    @Mock private MatchRepository matchRepository;
    @Mock private SeasonRepository seasonRepository;
    @Mock private TeamRepository teamRepository;

    @InjectMocks
    private PlayoffService playoffService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private UUID seasonId;
    private Season season;

    @BeforeEach
    void setUp() {
        seasonId = UUID.randomUUID();
        season = new Season();
        season.setId(seasonId);
        season.setTenantId(TENANT_A);
    }

    private Team createTeam(String name, UUID tenantId) {
        Team team = new Team();
        team.setId(UUID.randomUUID());
        team.setName(name);
        team.setTenantId(tenantId);
        return team;
    }

    // =========================================================================
    // generateBracket
    // =========================================================================

    @Nested
    @DisplayName("generateBracket")
    class GenerateBracket {

        @Test
        @DisplayName("should generate FINAL bracket with 2 teams and 2 legs")
        void generatesFinalBracketTwoLegs() {
            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            Team team1 = createTeam("Seed 1", TENANT_A);
            Team team2 = createTeam("Seed 2", TENANT_A);

            when(teamRepository.findByIdAndTenantId(team1.getId(), TENANT_A)).thenReturn(Optional.of(team1));
            when(teamRepository.findByIdAndTenantId(team2.getId(), TENANT_A)).thenReturn(Optional.of(team2));
            when(playoffTieRepository.save(any(PlayoffTie.class))).thenAnswer(inv -> {
                PlayoffTie tie = inv.getArgument(0);
                tie.setId(UUID.randomUUID());
                return tie;
            });

            List<UUID> seedIds = List.of(team1.getId(), team2.getId());
            playoffService.generateBracket(seasonId, PlayoffRound.FINAL, seedIds, 2);

            verify(playoffTieRepository, atLeastOnce()).save(any(PlayoffTie.class));
            verify(matchRepository, times(2)).save(any(Match.class));
        }

        @Test
        @DisplayName("should generate SEMI_FINALS bracket with 4 teams")
        void generatesSemiFinalsBracket() {
            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            List<Team> teams = new ArrayList<>();
            List<UUID> seedIds = new ArrayList<>();
            for (int i = 1; i <= 4; i++) {
                Team t = createTeam("Seed " + i, TENANT_A);
                teams.add(t);
                seedIds.add(t.getId());
                when(teamRepository.findByIdAndTenantId(t.getId(), TENANT_A)).thenReturn(Optional.of(t));
            }

            when(playoffTieRepository.save(any(PlayoffTie.class))).thenAnswer(inv -> {
                PlayoffTie tie = inv.getArgument(0);
                tie.setId(UUID.randomUUID());
                return tie;
            });

            playoffService.generateBracket(seasonId, PlayoffRound.SEMI_FINALS, seedIds, 1);

            verify(playoffTieRepository, atLeastOnce()).save(any(PlayoffTie.class));
            verify(matchRepository, atLeastOnce()).save(any(Match.class));
        }

        @Test
        @DisplayName("should generate QUARTER_FINALS bracket with 8 teams")
        void generatesQuarterFinalsBracket() {
            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            List<UUID> seedIds = new ArrayList<>();
            for (int i = 1; i <= 8; i++) {
                Team t = createTeam("Seed " + i, TENANT_A);
                seedIds.add(t.getId());
                when(teamRepository.findByIdAndTenantId(t.getId(), TENANT_A)).thenReturn(Optional.of(t));
            }

            when(playoffTieRepository.save(any(PlayoffTie.class))).thenAnswer(inv -> {
                PlayoffTie tie = inv.getArgument(0);
                tie.setId(UUID.randomUUID());
                return tie;
            });

            playoffService.generateBracket(seasonId, PlayoffRound.QUARTER_FINALS, seedIds, 1);

            verify(playoffTieRepository, atLeastOnce()).save(any(PlayoffTie.class));
        }

        @Test
        @DisplayName("should generate ROUND_OF_16 bracket with 16 teams")
        void generatesRoundOf16Bracket() {
            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            List<UUID> seedIds = new ArrayList<>();
            for (int i = 1; i <= 16; i++) {
                Team t = createTeam("Seed " + i, TENANT_A);
                seedIds.add(t.getId());
                when(teamRepository.findByIdAndTenantId(t.getId(), TENANT_A)).thenReturn(Optional.of(t));
            }

            when(playoffTieRepository.save(any(PlayoffTie.class))).thenAnswer(inv -> {
                PlayoffTie tie = inv.getArgument(0);
                tie.setId(UUID.randomUUID());
                return tie;
            });

            playoffService.generateBracket(seasonId, PlayoffRound.ROUND_OF_16, seedIds, 1);

            verify(playoffTieRepository, atLeastOnce()).save(any(PlayoffTie.class));
        }

        @Test
        @DisplayName("ISOLATION: should reject bracket generation if seeded team belongs to a different tenant")
        void rejectsTeamFromDifferentTenant() {
            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            Team team1 = createTeam("Seed 1", TENANT_A);
            Team foreignTeam = createTeam("Foreign Team", TENANT_B);

            when(teamRepository.findByIdAndTenantId(team1.getId(), TENANT_A)).thenReturn(Optional.of(team1));
            when(teamRepository.findByIdAndTenantId(foreignTeam.getId(), TENANT_A)).thenReturn(Optional.empty());

            List<UUID> seedIds = List.of(team1.getId(), foreignTeam.getId());

            assertThatThrownBy(() -> playoffService.generateBracket(seasonId, PlayoffRound.FINAL, seedIds, 1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Team not found");

            verify(matchRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw when team count does not match expected for round")
        void throwsWhenIncorrectTeamCount() {
            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            List<UUID> seedIds = List.of(UUID.randomUUID(), UUID.randomUUID());

            assertThatThrownBy(() -> playoffService.generateBracket(seasonId, PlayoffRound.SEMI_FINALS, seedIds, 1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Expected 4 teams for SEMI_FINALS, got 2");
        }
    }

    // =========================================================================
    // resolveTie
    // =========================================================================

    @Nested
    @DisplayName("resolveTie")
    class ResolveTie {

        @Test
        @DisplayName("should advance winner to next tie when away seed team wins on aggregate")
        void advancesAwayWinner() {
            UUID tieId = UUID.randomUUID();
            UUID nextTieId = UUID.randomUUID();

            Team higherSeed = createTeam("America", TENANT_A);
            Team lowerSeed = createTeam("Toluca", TENANT_A);

            PlayoffTie parentTie = new PlayoffTie();
            parentTie.setId(nextTieId);
            parentTie.setRound(PlayoffRound.FINAL);
            parentTie.setSeason(season);
            parentTie.setHomeSeedTeam(createTeam("Chivas", TENANT_A)); // Already has home team

            PlayoffTie tie = new PlayoffTie();
            tie.setId(tieId);
            tie.setRound(PlayoffRound.SEMI_FINALS);
            tie.setHomeSeedTeam(higherSeed);
            tie.setAwaySeedTeam(lowerSeed);
            tie.setNextTieId(nextTieId);

            // Match where away team (Toluca) wins 2 - 0
            Match m = new Match();
            m.setId(UUID.randomUUID());
            m.setHomeTeam(higherSeed);
            m.setAwayTeam(lowerSeed);
            m.setHomeScore(0);
            m.setAwayScore(2);
            m.setStatus(Match.MatchStatus.FINISHED);

            when(playoffTieRepository.findById(tieId)).thenReturn(Optional.of(tie));
            when(playoffTieRepository.findById(nextTieId)).thenReturn(Optional.of(parentTie));
            when(matchRepository.findByPlayoffTieId(tieId)).thenReturn(List.of(m));
            when(playoffTieRepository.save(any(PlayoffTie.class))).thenAnswer(inv -> inv.getArgument(0));

            playoffService.resolveTie(tieId);

            assertThat(tie.getAdvancingTeam()).isEqualTo(lowerSeed);
            assertThat(parentTie.getAwaySeedTeam()).isEqualTo(lowerSeed);
            verify(matchRepository).save(any(Match.class)); // creates match for next tie
        }

        @Test
        @DisplayName("should not advance when matches are not yet finished")
        void returnsEarlyWhenMatchesNotFinished() {
            UUID tieId = UUID.randomUUID();

            PlayoffTie tie = new PlayoffTie();
            tie.setId(tieId);

            Match m = new Match();
            m.setStatus(Match.MatchStatus.SCHEDULED);

            when(playoffTieRepository.findById(tieId)).thenReturn(Optional.of(tie));
            when(matchRepository.findByPlayoffTieId(tieId)).thenReturn(List.of(m));

            playoffService.resolveTie(tieId);

            verify(playoffTieRepository, never()).save(any(PlayoffTie.class));
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when tie is not found")
        void throwsWhenTieNotFound() {
            UUID tieId = UUID.randomUUID();
            when(playoffTieRepository.findById(tieId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> playoffService.resolveTie(tieId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Tie not found");
        }
    }

    // =========================================================================
    // deleteBracket
    // =========================================================================

    @Nested
    @DisplayName("deleteBracket")
    class DeleteBracket {

        @Test
        @DisplayName("should delete all matches and ties for season bracket")
        void deletesBracket() {
            PlayoffTie tie1 = new PlayoffTie();
            tie1.setId(UUID.randomUUID());
            tie1.setNextTieId(UUID.randomUUID());

            when(playoffTieRepository.findBySeasonId(seasonId)).thenReturn(List.of(tie1));

            playoffService.deleteBracket(seasonId);

            assertThat(tie1.getNextTieId()).isNull();
            verify(playoffTieRepository).saveAll(List.of(tie1));
            verify(matchRepository).deleteBySeasonIdAndStage(seasonId, MatchStage.PLAYOFFS);
            verify(playoffTieRepository).deleteBySeasonId(seasonId);
        }
    }
}
