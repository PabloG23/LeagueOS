package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.MatchPreviewDTO;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.shared.domain.exception.BusinessRuleException;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FixtureGeneratorServiceTest {

    @Mock
    private SeasonRepository seasonRepository;

    @Mock
    private TeamRegistrationRepository teamRegistrationRepository;

    @Mock
    private MatchRepository matchRepository;

    @InjectMocks
    private FixtureGeneratorService fixtureGeneratorService;

    private UUID seasonId;
    private Season season;

    @BeforeEach
    void setUp() {
        seasonId = UUID.randomUUID();
        season = new Season();
        season.setId(seasonId);
        season.setTenantId(UUID.randomUUID());
    }

    private Team createTeam(String name) {
        Team team = new Team();
        team.setId(UUID.randomUUID());
        team.setName(name);
        return team;
    }

    private TeamRegistration createRegistration(Team team, TeamRegistration.RegistrationStatus status) {
        TeamRegistration reg = new TeamRegistration();
        reg.setId(UUID.randomUUID());
        reg.setTeam(team);
        reg.setSeason(season);
        reg.setStatus(status);
        return reg;
    }

    @Test
    void previewRoundRobin_withEvenTeams_generatesAllPairsCorrectly() {
        when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

        List<Team> teams = List.of(
                createTeam("Team A"),
                createTeam("Team B"),
                createTeam("Team C"),
                createTeam("Team D")
        );

        List<TeamRegistration> regs = teams.stream()
                .map(t -> createRegistration(t, TeamRegistration.RegistrationStatus.APPROVED))
                .toList();

        when(teamRegistrationRepository.findBySeasonId(seasonId)).thenReturn(regs);

        List<MatchPreviewDTO> preview = fixtureGeneratorService.previewRoundRobinFixtures(seasonId);

        // 4 teams: n*(n-1)/2 = 6 matches, totalMatchdays = 3, matches per day = 2
        assertThat(preview).hasSize(6);

        Set<Integer> matchdays = new HashSet<>();
        Set<String> uniquePairings = new HashSet<>();

        for (MatchPreviewDTO match : preview) {
            matchdays.add(match.getMatchday());
            assertThat(match.getMatchDate()).isNull();
            assertThat(match.getHomeTeamId()).isNotEqualTo(match.getAwayTeamId());

            // Build canonical unordered pair key
            String pairKey = match.getHomeTeamId().compareTo(match.getAwayTeamId()) < 0
                    ? match.getHomeTeamId() + "-" + match.getAwayTeamId()
                    : match.getAwayTeamId() + "-" + match.getHomeTeamId();
            uniquePairings.add(pairKey);
        }

        assertThat(matchdays).containsExactlyInAnyOrder(1, 2, 3);
        assertThat(uniquePairings).hasSize(6);
    }

    @Test
    void previewRoundRobin_withOddTeams_handlesByeSlotsCorrectly() {
        when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

        List<Team> teams = List.of(
                createTeam("Team 1"),
                createTeam("Team 2"),
                createTeam("Team 3"),
                createTeam("Team 4"),
                createTeam("Team 5")
        );

        List<TeamRegistration> regs = teams.stream()
                .map(t -> createRegistration(t, TeamRegistration.RegistrationStatus.APPROVED))
                .toList();

        when(teamRegistrationRepository.findBySeasonId(seasonId)).thenReturn(regs);

        List<MatchPreviewDTO> preview = fixtureGeneratorService.previewRoundRobinFixtures(seasonId);

        // 5 teams: 5 matchdays, each team plays 4 games -> 5*4/2 = 10 matches total (2 per matchday, 1 BYE per matchday)
        assertThat(preview).hasSize(10);

        Set<Integer> matchdays = new HashSet<>();
        Set<String> uniquePairings = new HashSet<>();

        for (MatchPreviewDTO match : preview) {
            matchdays.add(match.getMatchday());
            assertThat(match.getMatchDate()).isNull();
            assertThat(match.getHomeTeamId()).isNotEqualTo(match.getAwayTeamId());

            String pairKey = match.getHomeTeamId().compareTo(match.getAwayTeamId()) < 0
                    ? match.getHomeTeamId() + "-" + match.getAwayTeamId()
                    : match.getAwayTeamId() + "-" + match.getHomeTeamId();
            uniquePairings.add(pairKey);
        }

        assertThat(matchdays).containsExactlyInAnyOrder(1, 2, 3, 4, 5);
        assertThat(uniquePairings).hasSize(10);
    }

    @Test
    void previewRoundRobin_withFewerThanTwoTeams_throwsBusinessRuleException() {
        when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

        List<TeamRegistration> regs = List.of(
                createRegistration(createTeam("Team Solo"), TeamRegistration.RegistrationStatus.APPROVED)
        );

        when(teamRegistrationRepository.findBySeasonId(seasonId)).thenReturn(regs);

        assertThatThrownBy(() -> fixtureGeneratorService.previewRoundRobinFixtures(seasonId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Se necesitan al menos 2 equipos aprobados");
    }

    @Test
    void previewRoundRobin_seasonNotFound_throwsResourceNotFoundException() {
        when(seasonRepository.findById(seasonId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fixtureGeneratorService.previewRoundRobinFixtures(seasonId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void generateRoundRobinMatches_persistsMatchesBatch() {
        when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

        List<Team> teams = List.of(
                createTeam("Alpha"),
                createTeam("Beta")
        );

        List<TeamRegistration> regs = teams.stream()
                .map(t -> createRegistration(t, TeamRegistration.RegistrationStatus.APPROVED))
                .toList();

        when(teamRegistrationRepository.findBySeasonId(seasonId)).thenReturn(regs);
        when(matchRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<Match> generated = fixtureGeneratorService.generateRoundRobinMatches(seasonId);

        assertThat(generated).hasSize(1);
        Match match = generated.get(0);
        assertThat(match.getSeason()).isEqualTo(season);
        assertThat(match.getTenantId()).isEqualTo(season.getTenantId());
        assertThat(match.getMatchday()).isEqualTo(1);
        assertThat(match.getMatchDate()).isNull();
        assertThat(match.getStatus()).isEqualTo(Match.MatchStatus.SCHEDULED);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Match>> captor = ArgumentCaptor.forClass(List.class);
        verify(matchRepository, times(1)).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
    }
}
