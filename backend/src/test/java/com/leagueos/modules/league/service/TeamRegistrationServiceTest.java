package com.leagueos.modules.league.service;

import com.leagueos.modules.league.domain.Person;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.dto.TeamRegistrationRequest;
import com.leagueos.modules.league.persistence.PersonRepository;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.media.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TeamRegistrationService — Season Enrollment & Public Team Registration")
class TeamRegistrationServiceTest {

    @Mock private TeamRegistrationRepository teamRegistrationRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private SeasonRepository seasonRepository;
    @Mock private PersonRepository personRepository;
    @Mock private StorageService storageService;

    @InjectMocks
    private TeamRegistrationService teamRegistrationService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private UUID seasonId;
    private Season season;

    @BeforeEach
    void setUp() {
        seasonId = UUID.randomUUID();
        season = new Season();
        season.setId(seasonId);
        season.setTenantId(TENANT_A);
    }

    // =========================================================================
    // registerTeam (Public registration)
    // =========================================================================

    @Nested
    @DisplayName("registerTeam")
    class RegisterTeam {

        @Test
        @DisplayName("should create representative, team, and PENDING registration with tenant ID")
        void registersTeamSuccessfully() {
            TeamRegistrationRequest request = new TeamRegistrationRequest();
            request.setSeasonId(seasonId);
            request.setTeamName("Real Sociedad");
            request.setRepresentativeName("Roberto López");
            request.setRepresentativePhone("7221234567");
            request.setLogoUrl("logos/real.png");

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));
            when(personRepository.save(any(Person.class))).thenAnswer(inv -> {
                Person p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                return p;
            });
            when(teamRepository.save(any(Team.class))).thenAnswer(inv -> {
                Team t = inv.getArgument(0);
                t.setId(UUID.randomUUID());
                return t;
            });
            when(teamRegistrationRepository.save(any(TeamRegistration.class))).thenAnswer(inv -> {
                TeamRegistration r = inv.getArgument(0);
                r.setId(UUID.randomUUID());
                return r;
            });

            TeamRegistration result = teamRegistrationService.registerTeam(request, TENANT_A);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(TeamRegistration.RegistrationStatus.PENDING);
            assertThat(result.getTenantId()).isEqualTo(TENANT_A);
            assertThat(result.getTeam().getName()).isEqualTo("REAL SOCIEDAD");

            verify(personRepository).save(argThat(p -> p.getTenantId().equals(TENANT_A) && p.getFirstName().equals("Roberto")));
            verify(teamRepository).save(argThat(t -> t.getTenantId().equals(TENANT_A) && t.getName().equals("REAL SOCIEDAD")));
            verify(teamRegistrationRepository).save(argThat(r -> r.getTenantId().equals(TENANT_A) && r.getStatus() == TeamRegistration.RegistrationStatus.PENDING));
        }

        @Test
        @DisplayName("should throw RuntimeException when season does not exist")
        void throwsWhenSeasonNotFound() {
            TeamRegistrationRequest request = new TeamRegistrationRequest();
            request.setSeasonId(seasonId);

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> teamRegistrationService.registerTeam(request, TENANT_A))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Torneo no encontrado");
        }
    }

    // =========================================================================
    // enrollTeamsToSeason & unenrollTeam
    // =========================================================================

    @Nested
    @DisplayName("enrollTeamsToSeason and unenrollTeam")
    class EnrollAndUnenroll {

        @Test
        @DisplayName("enrollTeamsToSeason should register teams with APPROVED status and skip already enrolled")
        void enrollsTeamsSuccessfully() {
            UUID team1Id = UUID.randomUUID();
            UUID team2Id = UUID.randomUUID();

            Team team1 = new Team();
            team1.setId(team1Id);
            Team team2 = new Team();
            team2.setId(team2Id);

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));
            when(teamRepository.findById(team1Id)).thenReturn(Optional.of(team1));
            when(teamRepository.findById(team2Id)).thenReturn(Optional.of(team2));

            // team1 is new, team2 is already enrolled
            when(teamRegistrationRepository.findBySeasonIdAndTeamId(seasonId, team1Id)).thenReturn(Optional.empty());
            when(teamRegistrationRepository.findBySeasonIdAndTeamId(seasonId, team2Id))
                    .thenReturn(Optional.of(new TeamRegistration()));

            when(teamRegistrationRepository.save(any(TeamRegistration.class))).thenAnswer(inv -> inv.getArgument(0));

            List<TeamRegistration> results = teamRegistrationService.enrollTeamsToSeason(
                    seasonId, List.of(team1Id, team2Id), TENANT_A
            );

            // Only team1 should be enrolled
            assertThat(results).hasSize(1);
            assertThat(results.get(0).getTeam()).isEqualTo(team1);
            assertThat(results.get(0).getStatus()).isEqualTo(TeamRegistration.RegistrationStatus.APPROVED);
            assertThat(results.get(0).getTenantId()).isEqualTo(TENANT_A);

            verify(teamRegistrationRepository, times(1)).save(any(TeamRegistration.class));
        }

        @Test
        @DisplayName("unenrollTeam should delete the registration if found")
        void unenrollsTeamSuccessfully() {
            UUID teamId = UUID.randomUUID();
            TeamRegistration reg = new TeamRegistration();
            reg.setId(UUID.randomUUID());

            when(teamRegistrationRepository.findBySeasonIdAndTeamId(seasonId, teamId)).thenReturn(Optional.of(reg));

            teamRegistrationService.unenrollTeam(seasonId, teamId);

            verify(teamRegistrationRepository).delete(reg);
        }
    }
}
