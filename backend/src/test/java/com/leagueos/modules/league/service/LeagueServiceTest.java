package com.leagueos.modules.league.service;

import com.leagueos.modules.league.domain.Person;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.Tenant;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.league.persistence.TenantRepository;
import com.leagueos.modules.media.service.StorageService;
import com.leagueos.modules.registration.domain.PlayerStatus;
import com.leagueos.modules.registration.persistence.SeasonRosterRepository;
import com.leagueos.modules.user.service.UserService;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeagueService — League & Team operations with Tenant Isolation")
class LeagueServiceTest {

    @Mock private TenantRepository tenantRepository;
    @Mock private SeasonRepository seasonRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private TeamRegistrationRepository teamRegistrationRepository;
    @Mock private com.leagueos.modules.competition.persistence.MatchRepository matchRepository;
    @Mock private com.leagueos.modules.competition.persistence.PlayoffTieRepository playoffTieRepository;
    @Mock private EntityManager entityManager;
    @Mock private com.leagueos.modules.league.persistence.SoccerFieldRepository soccerFieldRepository;
    @Mock private StorageService storageService;
    @Mock private SeasonRosterRepository seasonRosterRepository;
    @Mock private UserService userService;
    @Mock private Session session;

    private LeagueService leagueService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @BeforeEach
    void setUp() {
        TenantContext.clear();
        leagueService = new LeagueService(
                tenantRepository,
                seasonRepository,
                teamRepository,
                teamRegistrationRepository,
                matchRepository,
                playoffTieRepository,
                entityManager,
                soccerFieldRepository,
                storageService,
                seasonRosterRepository,
                userService
        );
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // =========================================================================
    // uploadTeamLogo — Tenant Validation
    // =========================================================================

    @Nested
    @DisplayName("uploadTeamLogo")
    class UploadTeamLogo {

        @Test
        @DisplayName("should successfully upload team logo and return signed URL for matching tenant")
        void uploadsLogoSuccessfullyForMatchingTenant() {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("Leones FC");
            team.setTenantId(TENANT_A);
            team.setLogoUrl(null);

            when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
            when(storageService.buildTenantKey(eq(TENANT_A), eq("teams"), anyString()))
                    .thenReturn("tenants/" + TENANT_A + "/teams/leones-fc_12345678.png");
            when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));
            when(storageService.getSignedUrl(anyString(), anyInt())).thenReturn("https://s3.amazonaws.com/signed-url");

            byte[] imageBytes = new byte[]{1, 2, 3};
            Team result = leagueService.uploadTeamLogo(teamId, imageBytes, "image/png", TENANT_A);

            assertThat(result.getLogoUrl()).contains("leones-fc");
            assertThat(result.getSignedLogoUrl()).isEqualTo("https://s3.amazonaws.com/signed-url");
            verify(storageService).uploadFile(anyString(), eq(imageBytes), eq("image/png"));
            verify(teamRepository).save(team);
        }

        @Test
        @DisplayName("ISOLATION: should reject upload if tenantId does not match team.tenantId")
        void rejectsUploadForMismatchedTenant() {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("Tigres");
            team.setTenantId(TENANT_A);

            when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

            byte[] imageBytes = new byte[]{1, 2, 3};
            assertThatThrownBy(() -> leagueService.uploadTeamLogo(teamId, imageBytes, "image/png", TENANT_B))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Unauthorized tenant access");

            verify(storageService, never()).uploadFile(any(), any(), any());
        }

        @Test
        @DisplayName("should delete old logo if previously uploaded to teams directory")
        void deletesOldLogoWhenPresent() {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("Leones FC");
            team.setTenantId(TENANT_A);
            team.setLogoUrl("tenants/111/teams/old_logo.png");

            when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
            when(storageService.buildTenantKey(eq(TENANT_A), eq("teams"), anyString()))
                    .thenReturn("tenants/" + TENANT_A + "/teams/leones-fc_new.png");
            when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));

            byte[] imageBytes = new byte[]{1, 2, 3};
            leagueService.uploadTeamLogo(teamId, imageBytes, "image/svg+xml", TENANT_A);

            verify(storageService).deleteFile("tenants/111/teams/old_logo.png");
            verify(storageService).uploadFile(eq("tenants/" + TENANT_A + "/teams/leones-fc_new.png"), eq(imageBytes), eq("image/svg+xml"));
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when team does not exist")
        void throwsWhenTeamNotFound() {
            UUID teamId = UUID.randomUUID();
            when(teamRepository.findById(teamId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> leagueService.uploadTeamLogo(teamId, new byte[]{}, "image/png", TENANT_A))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =========================================================================
    // createTeam — Tenant Validation & Name Uniqueness
    // =========================================================================

    @Nested
    @DisplayName("createTeam")
    class CreateTeam {

        @Test
        @DisplayName("should create team with active status and assign current tenant")
        void createsTeamSuccessfully() {
            TenantContext.setCurrentTenant(TENANT_A);

            Team input = new Team();
            input.setName("Halcones");
            input.setLogoUrl("halcones.png");

            Person rep = new Person();
            rep.setFirstName("Juan");
            rep.setLastName("Pérez");
            input.setRepresentative(rep);

            when(teamRepository.existsByNameIgnoreCaseAndTenantId("Halcones", TENANT_A)).thenReturn(false);
            when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));
            when(storageService.getSignedUrl(eq("halcones.png"), eq(120))).thenReturn("https://signed.com/halcones.png");

            Team created = leagueService.createTeam(input);

            assertThat(created.getName()).isEqualTo("Halcones");
            assertThat(created.getTenantId()).isEqualTo(TENANT_A);
            assertThat(created.isActive()).isTrue();
            assertThat(created.getRepresentative().getTenantId()).isEqualTo(TENANT_A);
            verify(userService).createOrUpdateTeamRepUser(eq(created), eq(rep), eq(TENANT_A));
        }

        @Test
        @DisplayName("should throw IllegalStateException when no TenantContext is available")
        void throwsWhenNoTenantContext() {
            TenantContext.clear();

            Team input = new Team();
            input.setName("Águilas");

            assertThatThrownBy(() -> leagueService.createTeam(input))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Tenant context not available");
        }

        @Test
        @DisplayName("ISOLATION: should reject creation if duplicate name exists in same tenant")
        void rejectsDuplicateNameInSameTenant() {
            TenantContext.setCurrentTenant(TENANT_A);

            Team input = new Team();
            input.setName("Cobras");

            when(teamRepository.existsByNameIgnoreCaseAndTenantId("Cobras", TENANT_A)).thenReturn(true);

            assertThatThrownBy(() -> leagueService.createTeam(input))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Ya existe un equipo activo con ese nombre en esta liga");
        }
    }

    // =========================================================================
    // getAllTeams — Tenant-Scoped Retrieval
    // =========================================================================

    @Nested
    @DisplayName("getAllTeams")
    class GetAllTeams {

        @Test
        @DisplayName("should query teams filtered by tenant when TenantContext is present")
        void queriesTeamsForTenant() {
            TenantContext.setCurrentTenant(TENANT_A);

            Team teamA = new Team();
            teamA.setId(UUID.randomUUID());
            teamA.setName("Team A");
            teamA.setTenantId(TENANT_A);

            Season activeSeason = new Season();
            activeSeason.setId(UUID.randomUUID());
            activeSeason.setTenantId(TENANT_A);
            activeSeason.setStatus(SeasonStatus.ACTIVE);

            when(teamRepository.findByTenantIdOrderByNameAsc(TENANT_A)).thenReturn(List.of(teamA));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.countActivePlayersBySeason(activeSeason.getId(), PlayerStatus.ACTIVE))
                    .thenReturn(Collections.emptyList());

            List<Team> results = leagueService.getAllTeams();

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getName()).isEqualTo("Team A");
            verify(teamRepository).findByTenantIdOrderByNameAsc(TENANT_A);
            verify(teamRepository, never()).findByTenantIdOrderByNameAsc(TENANT_B);
        }
    }

    // =========================================================================
    // activateSeason & getAllTenants
    // =========================================================================

    @Nested
    @DisplayName("activateSeason and getAllTenants")
    class SeasonAndTenantOperations {

        @Test
        @DisplayName("activateSeason should mark season as ACTIVE")
        void activatesSeason() {
            UUID seasonId = UUID.randomUUID();
            Season season = new Season();
            season.setId(seasonId);
            season.setStatus(SeasonStatus.DRAFT);

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));
            when(seasonRepository.save(any(Season.class))).thenAnswer(inv -> inv.getArgument(0));

            Season activated = leagueService.activateSeason(seasonId);

            assertThat(activated.getStatus()).isEqualTo(SeasonStatus.ACTIVE);
            verify(seasonRepository).save(season);
        }

        @Test
        @DisplayName("getAllTenants should disable Hibernate tenant filter for cross-tenant retrieval")
        void getAllTenantsDisablesFilter() {
            Tenant tenant1 = new Tenant();
            tenant1.setName("Liga 1");
            Tenant tenant2 = new Tenant();
            tenant2.setName("Liga 2");

            when(entityManager.unwrap(any())).thenReturn(session);
            when(tenantRepository.findAll()).thenReturn(List.of(tenant1, tenant2));

            List<Tenant> tenants = leagueService.getAllTenants();

            assertThat(tenants).hasSize(2);
            verify(session).disableFilter("tenantFilter");
            verify(tenantRepository).findAll();
        }

        @Test
        @DisplayName("getTenantBySubdomain should query tenantRepository")
        void getsTenantBySubdomain() {
            Tenant tenant = new Tenant();
            tenant.setSubdomain("sanlucas");

            when(tenantRepository.findBySubdomain("sanlucas")).thenReturn(Optional.of(tenant));

            Optional<Tenant> result = leagueService.getTenantBySubdomain("sanlucas");

            assertThat(result).isPresent();
            assertThat(result.get().getSubdomain()).isEqualTo("sanlucas");
        }

        @Test
        @DisplayName("createSeason should set default maxActivePlayersPerTeam to 30 when not set")
        void setsDefaultMaxPlayers() {
            TenantContext.setCurrentTenant(TENANT_A);

            Season season = new Season();
            season.setMaxActivePlayersPerTeam(0);

            when(seasonRepository.save(any(Season.class))).thenAnswer(inv -> inv.getArgument(0));

            Season saved = leagueService.createSeason(season);

            assertThat(saved.getMaxActivePlayersPerTeam()).isEqualTo(30);
        }
    }

    // =========================================================================
    // updateTeam, softDeleteTeam, activateTeam
    // =========================================================================

    @Nested
    @DisplayName("updateTeam, softDeleteTeam and activateTeam")
    class TeamStatusOperations {

        @Test
        @DisplayName("updateTeam should update name, logo, and representative")
        void updatesTeamDetails() {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("Antiguo Nombre");
            team.setTenantId(TENANT_A);

            Team updateDetails = new Team();
            updateDetails.setName("Nuevo Nombre");
            updateDetails.setLogoUrl("nuevo_logo.png");

            when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
            when(teamRepository.existsByNameIgnoreCaseAndTenantId("Nuevo Nombre", TENANT_A)).thenReturn(false);
            when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));
            when(storageService.getSignedUrl(eq("nuevo_logo.png"), eq(120))).thenReturn("https://signed.com/logo.png");

            Team result = leagueService.updateTeam(teamId, updateDetails);

            assertThat(result.getName()).isEqualTo("Nuevo Nombre");
            assertThat(result.getLogoUrl()).isEqualTo("nuevo_logo.png");
            assertThat(result.getSignedLogoUrl()).isEqualTo("https://signed.com/logo.png");
        }

        @Test
        @DisplayName("softDeleteTeam and activateTeam should toggle active flag")
        void togglesActiveState() {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setActive(true);

            when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
            when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));

            leagueService.softDeleteTeam(teamId);
            assertThat(team.isActive()).isFalse();

            leagueService.activateTeam(teamId);
            assertThat(team.isActive()).isTrue();
        }

        @Test
        @DisplayName("updateTeam should reject update when new name is already taken by another team")
        void rejectsDuplicateNameOnUpdate() {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("América");
            team.setTenantId(TENANT_A);

            Team updateDetails = new Team();
            updateDetails.setName("Chivas");

            when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
            when(teamRepository.existsByNameIgnoreCaseAndTenantId("Chivas", TENANT_A)).thenReturn(true);

            assertThatThrownBy(() -> leagueService.updateTeam(teamId, updateDetails))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Ya existe otro equipo activo con ese nombre");
        }

        @Test
        @DisplayName("updateTeam should update representative fields when representative already exists")
        void updatesExistingRepresentative() {
            UUID teamId = UUID.randomUUID();
            Team team = new Team();
            team.setId(teamId);
            team.setName("Toluca");
            team.setTenantId(TENANT_A);

            Person existingRep = new Person();
            existingRep.setFirstName("Renato");
            existingRep.setLastName("Paiva");
            existingRep.setPhone("7221112233");
            team.setRepresentative(existingRep);

            Team updateDetails = new Team();
            Person newRepInfo = new Person();
            newRepInfo.setFirstName("Antonio");
            newRepInfo.setLastName("Sinha");
            newRepInfo.setPhone("7229998877");
            updateDetails.setRepresentative(newRepInfo);

            when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
            when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));

            Team updated = leagueService.updateTeam(teamId, updateDetails);

            assertThat(updated.getRepresentative().getFirstName()).isEqualTo("Antonio");
            assertThat(updated.getRepresentative().getLastName()).isEqualTo("Sinha");
            assertThat(updated.getRepresentative().getPhone()).isEqualTo("7229998877");
        }
    }

    // =========================================================================
    // Season Lifecycle & Matchdays
    // =========================================================================

    @Nested
    @DisplayName("Season Lifecycle and Matchdays")
    class SeasonLifecycle {

        @Test
        @DisplayName("activateSeason should deactivate other active seasons in same division")
        void activatesSeasonAndDeactivatesOthersInDivision() {
            UUID seasonId = UUID.randomUUID();
            UUID divisionId = UUID.randomUUID();

            com.leagueos.modules.league.domain.Division division = new com.leagueos.modules.league.domain.Division();
            division.setId(divisionId);

            Season target = new Season();
            target.setId(seasonId);
            target.setDivision(division);
            target.setStatus(SeasonStatus.DRAFT);

            Season otherSeason = new Season();
            otherSeason.setId(UUID.randomUUID());
            otherSeason.setDivision(division);
            otherSeason.setStatus(SeasonStatus.ACTIVE);

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(target));
            when(seasonRepository.findByStatus(SeasonStatus.ACTIVE)).thenReturn(List.of(otherSeason));
            when(seasonRepository.save(any(Season.class))).thenAnswer(inv -> inv.getArgument(0));

            Season activated = leagueService.activateSeason(seasonId);

            assertThat(activated.getStatus()).isEqualTo(SeasonStatus.ACTIVE);
            assertThat(otherSeason.getStatus()).isEqualTo(SeasonStatus.COMPLETED);
            verify(seasonRepository).saveAll(List.of(otherSeason));
        }

        @Test
        @DisplayName("advanceMatchday and updateCurrentMatchday should update matchday")
        void updatesMatchday() {
            UUID seasonId = UUID.randomUUID();
            Season season = new Season();
            season.setId(seasonId);
            season.setCurrentMatchday(3);

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));
            when(seasonRepository.save(any(Season.class))).thenAnswer(inv -> inv.getArgument(0));

            leagueService.advanceMatchday(seasonId);
            assertThat(season.getCurrentMatchday()).isEqualTo(4);

            leagueService.updateCurrentMatchday(seasonId, 10);
            assertThat(season.getCurrentMatchday()).isEqualTo(10);
        }

        @Test
        @DisplayName("deleteDraftSeason should delete matches, ties and season when status is DRAFT")
        void deletesDraftSeason() {
            UUID seasonId = UUID.randomUUID();
            Season season = new Season();
            season.setId(seasonId);
            season.setStatus(SeasonStatus.DRAFT);

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            leagueService.deleteDraftSeason(seasonId);

            verify(matchRepository).deleteBySeasonId(seasonId);
            verify(playoffTieRepository).deleteBySeasonId(seasonId);
            verify(teamRegistrationRepository).deleteBySeasonId(seasonId);
            verify(seasonRepository).delete(season);
        }

        @Test
        @DisplayName("deleteDraftSeason should throw IllegalStateException when status is not DRAFT")
        void throwsWhenDeletingNonDraftSeason() {
            UUID seasonId = UUID.randomUUID();
            Season season = new Season();
            season.setId(seasonId);
            season.setStatus(SeasonStatus.ACTIVE);

            when(seasonRepository.findById(seasonId)).thenReturn(Optional.of(season));

            assertThatThrownBy(() -> leagueService.deleteDraftSeason(seasonId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Only seasons in DRAFT status can be deleted");
        }
    }

    // =========================================================================
    // Soccer Fields & Teams
    // =========================================================================

    @Nested
    @DisplayName("Soccer Fields & Teams")
    class FieldsAndTeams {

        @Test
        @DisplayName("getAllTeams should return teams with active players count")
        void getAllTeamsWithPlayerCounts() {
            TenantContext.setCurrentTenant(TENANT_A);
            Team t1 = new Team();
            t1.setId(UUID.randomUUID());
            t1.setName("Atlas");
            t1.setLogoUrl("atlas.png");

            when(teamRepository.findByTenantIdOrderByNameAsc(TENANT_A)).thenReturn(List.of(t1));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE)).thenReturn(Collections.emptyList());
            when(seasonRosterRepository.countActivePlayersAll(PlayerStatus.ACTIVE)).thenReturn(List.of());
            when(storageService.getSignedUrl("atlas.png", 120)).thenReturn("https://signed.com/atlas.png");

            List<Team> teams = leagueService.getAllTeams();

            assertThat(teams).hasSize(1);
            assertThat(teams.get(0).getSignedLogoUrl()).isEqualTo("https://signed.com/atlas.png");
        }

        @Test
        @DisplayName("createTeam should throw IllegalArgumentException when name is duplicated in tenant")
        void createTeamThrowsOnDuplicateName() {
            TenantContext.setCurrentTenant(TENANT_A);
            Team team = new Team();
            team.setName("América");

            when(teamRepository.existsByNameIgnoreCaseAndTenantId("América", TENANT_A)).thenReturn(true);

            assertThatThrownBy(() -> leagueService.createTeam(team))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Ya existe un equipo activo con ese nombre");
        }

        @Test
        @DisplayName("createField, updateField and deleteField should manage soccer fields")
        void managesSoccerFields() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID fieldId = UUID.randomUUID();

            com.leagueos.modules.league.domain.SoccerField field = new com.leagueos.modules.league.domain.SoccerField();
            field.setId(fieldId);
            field.setName("Campo 1");
            field.setLocationUrl("https://maps.google.com");
            field.setAddress("Av. Principal 123");

            when(soccerFieldRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(soccerFieldRepository.findByIdAndTenantId(fieldId, TENANT_A)).thenReturn(Optional.of(field));
            when(soccerFieldRepository.findByTenantIdOrderByNameAsc(TENANT_A)).thenReturn(List.of(field));

            var created = leagueService.createField(field);
            assertThat(created.getName()).isEqualTo("Campo 1");

            var fields = leagueService.getFields();
            assertThat(fields).hasSize(1);

            com.leagueos.modules.league.domain.SoccerField updateDetails = new com.leagueos.modules.league.domain.SoccerField();
            updateDetails.setName("Campo 1 Renovado");
            var updated = leagueService.updateField(fieldId, updateDetails);
            assertThat(updated.getName()).isEqualTo("Campo 1 Renovado");

            leagueService.deleteField(fieldId);
            verify(soccerFieldRepository).delete(field);
        }

        @Test
        @DisplayName("createField should throw IllegalArgumentException when name is null or blank")
        void createFieldThrowsWhenNameBlank() {
            com.leagueos.modules.league.domain.SoccerField field = new com.leagueos.modules.league.domain.SoccerField();
            field.setName("  ");

            assertThatThrownBy(() -> leagueService.createField(field))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("El nombre del campo es obligatorio");
        }

        @Test
        @DisplayName("getFields and getAllSeasons should query findAll when tenantId is null")
        void queriesGlobalWhenTenantNull() {
            TenantContext.clear();

            when(soccerFieldRepository.findAll()).thenReturn(List.of());
            when(seasonRepository.findAll()).thenReturn(List.of());

            assertThat(leagueService.getFields()).isEmpty();
            assertThat(leagueService.getAllSeasons()).isEmpty();
        }
    }
}
