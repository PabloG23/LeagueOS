package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.TeamStandingDTO;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompetitionPhaseServiceTest {

    @Mock
    private StatsService statsService;
    @Mock
    private SeasonRepository seasonRepository;
    @Mock
    private TeamRegistrationRepository teamRegistrationRepository;
    @Mock
    private MatchRepository matchRepository;

    @InjectMocks
    private CompetitionPhaseService competitionPhaseService;

    private UUID seasonId;
    private Season season;

    @BeforeEach
    void setUp() {
        seasonId = UUID.randomUUID();
        season = new Season();
        season.setId(seasonId);
        season.setTenantId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Should split odd number of teams: leftover goes down to Permanencia (e.g. 5 teams -> 2 Campeonato, 3 Permanencia)")
    void testOddTeamsSplitPutsLeftoverDown() {
        when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

        List<TeamStandingDTO> standings = new ArrayList<>();
        List<TeamRegistration> registrations = new ArrayList<>();

        for (int i = 1; i <= 5; i++) {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("Team " + i);

            standings.add(TeamStandingDTO.builder().id(teamId).team(team.getName()).rank(i).build());

            TeamRegistration reg = new TeamRegistration();
            reg.setId(UUID.randomUUID());
            reg.setTeam(team);
            reg.setSeason(season);
            reg.setStatus(TeamRegistration.RegistrationStatus.APPROVED);
            registrations.add(reg);
        }

        when(statsService.calculateStandings(seasonId)).thenReturn(standings);
        when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                .thenReturn(registrations);
        when(matchRepository.findBySeasonId(seasonId)).thenReturn(List.of());

        competitionPhaseService.splitSeasonIntoPhase2(seasonId);

        ArgumentCaptor<TeamRegistration> regCaptor = ArgumentCaptor.forClass(TeamRegistration.class);
        verify(teamRegistrationRepository, atLeast(5)).save(regCaptor.capture());

        List<TeamRegistration> savedRegs = regCaptor.getAllValues();

        long campeonatoCount = savedRegs.stream().filter(r -> "CAMPEONATO".equals(r.getPhaseGroup())).count();
        long permanenciaCount = savedRegs.stream().filter(r -> "PERMANENCIA".equals(r.getPhaseGroup())).count();

        // 5 teams / 2 = 2 to Campeonato, remaining 3 to Permanencia
        assertEquals(2, campeonatoCount, "Campeonato must have floor(5/2) = 2 teams");
        assertEquals(3, permanenciaCount, "Permanencia must have ceil(5/2) = 3 teams");
    }

    @Test
    @DisplayName("Should split even number of teams exactly into halves (e.g. 6 teams -> 3 Campeonato, 3 Permanencia)")
    void testEvenTeamsSplitEqually() {
        when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

        List<TeamStandingDTO> standings = new ArrayList<>();
        List<TeamRegistration> registrations = new ArrayList<>();

        for (int i = 1; i <= 6; i++) {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("Team " + i);

            standings.add(TeamStandingDTO.builder().id(teamId).team(team.getName()).rank(i).build());

            TeamRegistration reg = new TeamRegistration();
            reg.setId(UUID.randomUUID());
            reg.setTeam(team);
            reg.setSeason(season);
            reg.setStatus(TeamRegistration.RegistrationStatus.APPROVED);
            registrations.add(reg);
        }

        when(statsService.calculateStandings(seasonId)).thenReturn(standings);
        when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                .thenReturn(registrations);
        when(matchRepository.findBySeasonId(seasonId)).thenReturn(List.of());

        competitionPhaseService.splitSeasonIntoPhase2(seasonId);

        ArgumentCaptor<TeamRegistration> regCaptor = ArgumentCaptor.forClass(TeamRegistration.class);
        verify(teamRegistrationRepository, atLeast(6)).save(regCaptor.capture());

        List<TeamRegistration> savedRegs = regCaptor.getAllValues();

        long campeonatoCount = savedRegs.stream().filter(r -> "CAMPEONATO".equals(r.getPhaseGroup())).count();
        long permanenciaCount = savedRegs.stream().filter(r -> "PERMANENCIA".equals(r.getPhaseGroup())).count();

        assertEquals(3, campeonatoCount, "Campeonato must have 3 teams");
        assertEquals(3, permanenciaCount, "Permanencia must have 3 teams");
    }
}
