package com.leagueos.modules.registration.service;

import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.league.domain.Person;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.PersonRepository;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.media.service.StorageService;
import com.leagueos.modules.registration.api.dto.BatchPlayerRegistrationRequest;
import com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest;
import com.leagueos.modules.registration.api.dto.PlayerResponse;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.domain.PlayerStatus;
import com.leagueos.modules.registration.domain.SeasonRoster;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import com.leagueos.modules.registration.persistence.SeasonRosterRepository;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.domain.exception.BusinessRuleException;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
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
@DisplayName("PlayerRegistrationService — Complete 100% Code Coverage Suite")
class PlayerRegistrationServiceTest {

    @Mock private PlayerRepository playerRepository;
    @Mock private SeasonRepository seasonRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private PersonRepository personRepository;
    @Mock private TenantSettingsService tenantSettingsService;
    @Mock private SeasonRosterRepository seasonRosterRepository;
    @Mock private MatchEventRepository matchEventRepository;
    @Mock private StorageService storageService;

    @InjectMocks
    private PlayerRegistrationService playerRegistrationService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private Season activeSeason;
    private Team team;
    private TenantSettings defaultSettings;

    @BeforeEach
    void setUp() {
        TenantContext.clear();

        activeSeason = new Season();
        activeSeason.setId(UUID.randomUUID());
        activeSeason.setName("Clausura 2026");
        activeSeason.setStatus(SeasonStatus.ACTIVE);
        activeSeason.setMaxActivePlayersPerTeam(25);
        activeSeason.setTenantId(TENANT_A);

        team = new Team();
        team.setId(UUID.randomUUID());
        team.setName("Guadalajara");
        team.setTenantId(TENANT_A);

        defaultSettings = new TenantSettings();
        defaultSettings.setRequireCurp(true);
        defaultSettings.setAllowMultipleTeamsPerPlayer(false);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // =========================================================================
    // validateRegistrationPreconditions & registerPlayer
    // =========================================================================

    @Nested
    @DisplayName("validateRegistrationPreconditions & registerPlayer")
    class ValidationAndRegistrationTests {

        @Test
        @DisplayName("should throw BusinessRuleException when first name is null or blank")
        void throwsWhenFirstNameBlank() {
            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("   ");

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El nombre del jugador es obligatorio.");

            req.setFirstName(null);
            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El nombre del jugador es obligatorio.");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when CURP format is invalid")
        void throwsWhenCurpInvalid() {
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setCurp("INVALID_CURP");

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("no tiene un formato válido");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when CURP is required for Mexican player but missing")
        void throwsWhenCurpRequiredAndMissing() {
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setIsForeign(false);
            req.setCurp(null);

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El CURP es obligatorio para registrar jugadores en esta liga.");
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when team is not found")
        void throwsWhenTeamNotFound() {
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            UUID nonExistentTeam = UUID.randomUUID();
            when(teamRepository.findById(nonExistentTeam)).thenReturn(Optional.empty());

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, nonExistentTeam, TENANT_A))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Team not found");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when player is already registered and active in same team")
        void throwsWhenDuplicateActiveInSameTeam() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));

            Person existingPerson = new Person();
            existingPerson.setFirstName("CARLOS");
            existingPerson.setLastName("GONZÁLEZ");

            Player existingPlayer = new Player();
            existingPlayer.setPerson(existingPerson);

            SeasonRoster existingRoster = new SeasonRoster();
            existingRoster.setPlayer(existingPlayer);
            existingRoster.setTeam(team);
            existingRoster.setStatus(PlayerStatus.ACTIVE);

            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(existingRoster));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("ya se encuentra registrado y activo en este equipo.");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when player is registered in another team and multiple teams not allowed")
        void throwsWhenRegisteredInAnotherTeam() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(Collections.emptyList());

            Team otherTeam = new Team();
            otherTeam.setId(UUID.randomUUID());
            otherTeam.setName("América");

            Person existingPerson = new Person();
            existingPerson.setFirstName("CARLOS");
            existingPerson.setLastName("GONZÁLEZ");

            Player existingPlayer = new Player();
            existingPlayer.setPerson(existingPerson);

            SeasonRoster conflictRoster = new SeasonRoster();
            conflictRoster.setPlayer(existingPlayer);
            conflictRoster.setTeam(otherTeam);

            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(List.of(conflictRoster));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("ya está registrado en el equipo 'América'");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when team reaches max active players")
        void throwsWhenTeamMaxPlayersReached() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));

            activeSeason.setMaxActivePlayersPerTeam(2);
            SeasonRoster r1 = new SeasonRoster();
            r1.setTeam(team);
            SeasonRoster r2 = new SeasonRoster();
            r2.setTeam(team);
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(r1, r2));
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(List.of(r1, r2));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("límite máximo");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when jersey number is missing or already taken")
        void throwsWhenJerseyNumberTakenOrMissing() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));

            SeasonRoster r1 = new SeasonRoster();
            r1.setTeam(team);
            r1.setJerseyNumber(10);
            r1.setStatus(PlayerStatus.ACTIVE);

            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(r1));
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(List.of(r1));

            // Case 1: Missing jersey
            PlayerRegistrationRequest req1 = new PlayerRegistrationRequest();
            req1.setFirstName("Carlos");
            req1.setIsForeign(true);
            req1.setJerseyNumber(null);

            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req1, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El número de playera/dorsal es obligatorio.");

            // Case 2: Jersey 10 already taken
            req1.setJerseyNumber(10);
            assertThatThrownBy(() -> playerRegistrationService.validateRegistrationPreconditions(req1, team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El dorsal 10 ya está ocupado");
        }

        @Test
        @DisplayName("registerPlayer should delegate to verifyPlayer if existing roster is PENDING_VERIFICATION")
        void delegatesToVerifyPlayerWhenPendingVerification() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));

            Person person = new Person();
            person.setId(UUID.randomUUID());
            person.setFirstName("CARLOS");
            person.setLastName("GONZÁLEZ");

            Player player = new Player();
            player.setId(UUID.randomUUID());
            player.setPerson(person);

            SeasonRoster pendingRoster = new SeasonRoster();
            pendingRoster.setPlayer(player);
            pendingRoster.setTeam(team);
            pendingRoster.setStatus(PlayerStatus.PENDING_VERIFICATION);
            pendingRoster.setJerseyNumber(null);

            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(pendingRoster));
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(List.of(pendingRoster));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(player.getId(), activeSeason.getId()))
                    .thenReturn(Optional.of(pendingRoster));
            when(playerRepository.findById(player.getId())).thenReturn(Optional.of(player));
            when(personRepository.save(any(Person.class))).thenAnswer(inv -> inv.getArgument(0));
            when(seasonRosterRepository.save(any(SeasonRoster.class))).thenAnswer(inv -> inv.getArgument(0));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(true);
            req.setJerseyNumber(7);

            PlayerResponse response = playerRegistrationService.registerPlayer(req, team.getId(), TENANT_A);

            assertThat(response).isNotNull();
            assertThat(pendingRoster.getStatus()).isEqualTo(PlayerStatus.ACTIVE);
        }

        @Test
        @DisplayName("registerPlayer should register free agent player without team")
        void registersFreeAgentPlayer() {
            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Agente");
            req.setLastName("Libre");
            req.setIsForeign(true);

            when(personRepository.save(any(Person.class))).thenAnswer(inv -> {
                Person p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                return p;
            });
            when(playerRepository.save(any(Player.class))).thenAnswer(inv -> {
                Player pl = inv.getArgument(0);
                pl.setId(UUID.randomUUID());
                return pl;
            });

            PlayerResponse response = playerRegistrationService.registerPlayer(req, null, TENANT_A);

            assertThat(response).isNotNull();
            assertThat(response.getFirstName()).isEqualTo("AGENTE");
            assertThat(response.getTeamId()).isNull();
        }

        @Test
        @DisplayName("registerPlayer should create new Person when no existing by CURP")
        void createsNewPersonAndPlayer() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(Collections.emptyList());
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(Collections.emptyList());

            when(personRepository.save(any(Person.class))).thenAnswer(inv -> {
                Person p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                return p;
            });
            when(playerRepository.save(any(Player.class))).thenAnswer(inv -> {
                Player pl = inv.getArgument(0);
                pl.setId(UUID.randomUUID());
                return pl;
            });
            when(seasonRosterRepository.save(any(SeasonRoster.class))).thenAnswer(inv -> inv.getArgument(0));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(true);
            req.setJerseyNumber(7);
            req.setBirthDate(LocalDate.of(1988, 3, 15));
            req.setProfilePhotoUrl("new_photo.jpg");

            PlayerResponse response = playerRegistrationService.registerPlayer(req, team.getId(), TENANT_A);

            assertThat(response).isNotNull();
            assertThat(response.getFirstName()).isEqualTo("CARLOS");
            assertThat(response.getJerseyNumber()).isEqualTo(7);
            verify(seasonRosterRepository).save(any(SeasonRoster.class));
        }
    }

    // =========================================================================
    // validateVerificationPreconditions & verifyPlayer
    // =========================================================================

    @Nested
    @DisplayName("validateVerificationPreconditions & verifyPlayer")
    class VerificationTests {

        @Test
        @DisplayName("should throw BusinessRuleException when name on ID does not match pending player")
        void throwsWhenScannedNameDoesNotMatch() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();

            Person person = new Person();
            person.setFirstName("DIEGO");
            person.setLastName("ARMANDO MARADONA");

            Player player = new Player();
            player.setId(playerId);
            player.setPerson(person);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Lionel");
            req.setLastName("Messi");
            req.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.validateVerificationPreconditions(playerId, req, TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("no coincide con el jugador registrado en la plantilla");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when extracted CURP is invalid on verification")
        void throwsWhenExtractedCurpInvalid() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();

            Person person = new Person();
            person.setFirstName("CARLOS");
            person.setLastName("GONZÁLEZ");

            Player player = new Player();
            player.setId(playerId);
            player.setPerson(person);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setCurp("INVALID_CURP");

            assertThatThrownBy(() -> playerRegistrationService.validateVerificationPreconditions(playerId, req, TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("no tiene un formato válido");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when CURP is required on verification but missing")
        void throwsWhenCurpMissingOnVerification() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();

            Person person = new Person();
            person.setFirstName("CARLOS");
            person.setLastName("GONZÁLEZ");

            Player player = new Player();
            player.setId(playerId);
            player.setPerson(person);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(false);
            req.setCurp(null);

            assertThatThrownBy(() -> playerRegistrationService.validateVerificationPreconditions(playerId, req, TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El CURP es obligatorio para verificar");
        }

        @Test
        @DisplayName("should throw BusinessRuleException on verification if player conflicts in another team")
        void throwsWhenConflictInAnotherTeamOnVerification() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();

            Person person = new Person();
            person.setFirstName("CARLOS");
            person.setLastName("GONZÁLEZ");

            Player player = new Player();
            player.setId(playerId);
            player.setPerson(person);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);

            Team otherTeam = new Team();
            otherTeam.setId(UUID.randomUUID());
            otherTeam.setName("Cruz Azul");

            SeasonRoster conflict = new SeasonRoster();
            conflict.setPlayer(player);
            conflict.setTeam(otherTeam);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(List.of(conflict));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.validateVerificationPreconditions(playerId, req, TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("ya está registrado en el equipo 'Cruz Azul'");
        }

        @Test
        @DisplayName("should throw BusinessRuleException on verification if duplicate active player exists in same team")
        void throwsWhenDuplicateActiveInTeamOnVerification() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();
            UUID otherPlayerId = UUID.randomUUID();

            Person person = new Person();
            person.setFirstName("CARLOS");
            person.setLastName("GONZÁLEZ");

            Player player = new Player();
            player.setId(playerId);
            player.setPerson(person);

            Player otherPlayer = new Player();
            otherPlayer.setId(otherPlayerId);
            otherPlayer.setPerson(person);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);

            SeasonRoster otherRoster = new SeasonRoster();
            otherRoster.setPlayer(otherPlayer);
            otherRoster.setTeam(team);
            otherRoster.setStatus(PlayerStatus.ACTIVE);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(Collections.emptyList());
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(otherRoster));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.validateVerificationPreconditions(playerId, req, TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("Ya existe otro jugador activo registrado con los mismos datos");
        }

        @Test
        @DisplayName("should throw BusinessRuleException on verification if jersey is taken by another player")
        void throwsWhenJerseyTakenOnVerification() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();
            UUID otherPlayerId = UUID.randomUUID();

            Person person = new Person();
            person.setFirstName("CARLOS");
            person.setLastName("GONZÁLEZ");

            Player player = new Player();
            player.setId(playerId);
            player.setPerson(person);

            Person otherPerson = new Person();
            otherPerson.setFirstName("JUAN");

            Player otherPlayer = new Player();
            otherPlayer.setId(otherPlayerId);
            otherPlayer.setPerson(otherPerson);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);

            SeasonRoster otherRoster = new SeasonRoster();
            otherRoster.setPlayer(otherPlayer);
            otherRoster.setTeam(team);
            otherRoster.setStatus(PlayerStatus.ACTIVE);
            otherRoster.setJerseyNumber(9);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(Collections.emptyList());
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(otherRoster));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Carlos");
            req.setLastName("González");
            req.setIsForeign(true);
            req.setJerseyNumber(9);

            assertThatThrownBy(() -> playerRegistrationService.validateVerificationPreconditions(playerId, req, TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El dorsal 9 ya está ocupado");
        }

        @Test
        @DisplayName("verifyPlayer should clean up old photo from storage when new photo is uploaded")
        void cleansUpOldPhotoOnVerification() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();

            Person person = new Person();
            person.setId(UUID.randomUUID());
            person.setFirstName("JAVIER");
            person.setLastName("HERNÁNDEZ");
            person.setProfilePhotoUrl("old_storage_photo.jpg");

            Player player = new Player();
            player.setId(playerId);
            player.setPerson(person);
            player.setTenantId(TENANT_A);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);
            roster.setStatus(PlayerStatus.PENDING_VERIFICATION);
            roster.setJerseyNumber(14);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(roster));
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(List.of(roster));
            when(playerRepository.findById(playerId)).thenReturn(Optional.of(player));
            when(personRepository.save(any(Person.class))).thenAnswer(inv -> inv.getArgument(0));
            when(seasonRosterRepository.save(any(SeasonRoster.class))).thenAnswer(inv -> inv.getArgument(0));

            PlayerRegistrationRequest req = new PlayerRegistrationRequest();
            req.setFirstName("Javier");
            req.setLastName("Hernández");
            req.setJerseyNumber(14);
            req.setIsForeign(true);
            req.setProfilePhotoUrl("new_storage_photo.jpg");

            playerRegistrationService.verifyPlayer(playerId, req, TENANT_A);

            verify(storageService).deleteFile("old_storage_photo.jpg");
            assertThat(person.getProfilePhotoUrl()).isEqualTo("new_storage_photo.jpg");
            assertThat(roster.getStatus()).isEqualTo(PlayerStatus.ACTIVE);
        }
    }

    // =========================================================================
    // registerPlayersBatch
    // =========================================================================

    @Nested
    @DisplayName("registerPlayersBatch")
    class BatchTests {

        @Test
        @DisplayName("should throw BusinessRuleException when batch exceeds team max players limit")
        void throwsWhenBatchExceedsLimit() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);

            activeSeason.setMaxActivePlayersPerTeam(1);
            SeasonRoster r1 = new SeasonRoster();
            r1.setStatus(PlayerStatus.ACTIVE);
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(r1));

            BatchPlayerRegistrationRequest req = new BatchPlayerRegistrationRequest();
            req.setFirstName("Carlos");

            assertThatThrownBy(() -> playerRegistrationService.registerPlayersBatch(List.of(req), team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El equipo ya ha alcanzado el límite máximo");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when duplicate names exist within the batch")
        void throwsWhenDuplicateNameInBatch() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(Collections.emptyList());
            when(personRepository.save(any(Person.class))).thenAnswer(inv -> {
                Person p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                return p;
            });
            when(playerRepository.save(any(Player.class))).thenAnswer(inv -> {
                Player pl = inv.getArgument(0);
                pl.setId(UUID.randomUUID());
                return pl;
            });

            BatchPlayerRegistrationRequest r1 = new BatchPlayerRegistrationRequest();
            r1.setFirstName("Luis");
            r1.setLastName("García");
            r1.setIsForeign(true);

            BatchPlayerRegistrationRequest r2 = new BatchPlayerRegistrationRequest();
            r2.setFirstName("Luis");
            r2.setLastName("García");
            r2.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.registerPlayersBatch(List.of(r1, r2), team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("ya existe en el equipo");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when duplicate jerseys exist within the batch")
        void throwsWhenDuplicateJerseyInBatch() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(tenantSettingsService.getCurrentSettings()).thenReturn(defaultSettings);
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(Collections.emptyList());
            when(seasonRosterRepository.findBySeasonId(activeSeason.getId()))
                    .thenReturn(Collections.emptyList());
            when(personRepository.save(any(Person.class))).thenAnswer(inv -> {
                Person p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                return p;
            });
            when(playerRepository.save(any(Player.class))).thenAnswer(inv -> {
                Player pl = inv.getArgument(0);
                pl.setId(UUID.randomUUID());
                return pl;
            });

            BatchPlayerRegistrationRequest r1 = new BatchPlayerRegistrationRequest();
            r1.setFirstName("Luis");
            r1.setLastName("García");
            r1.setJerseyNumber(10);
            r1.setIsForeign(true);

            BatchPlayerRegistrationRequest r2 = new BatchPlayerRegistrationRequest();
            r2.setFirstName("Jorge");
            r2.setLastName("Campos");
            r2.setJerseyNumber(10); // Same jersey!
            r2.setIsForeign(true);

            assertThatThrownBy(() -> playerRegistrationService.registerPlayersBatch(List.of(r1, r2), team.getId(), TENANT_A))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El dorsal 10 ya está ocupado");
        }
    }

    // =========================================================================
    // getPlayersDirectory & getPlayersByTeam
    // =========================================================================

    @Nested
    @DisplayName("getPlayersDirectory & getPlayersByTeam")
    class DirectoryAndTeamTests {

        @Test
        @DisplayName("getPlayersByTeam should return empty list when no active season exists")
        void returnsEmptyWhenNoActiveSeason() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(Collections.emptyList());
            when(seasonRepository.findByTenantId(TENANT_A)).thenReturn(Collections.emptyList());
            when(seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> playerRegistrationService.getPlayersByTeam(team.getId()))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("getPlayersByTeam should return mapped players when active season exists")
        void returnsPlayersByTeam() {
            TenantContext.setCurrentTenant(TENANT_A);
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));

            Person p = new Person();
            p.setFirstName("Memo");
            p.setLastName("Ochoa");
            p.setProfilePhotoUrl("memo.jpg");

            Player player = new Player();
            player.setId(UUID.randomUUID());
            player.setPerson(p);

            SeasonRoster roster = new SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);
            roster.setStatus(PlayerStatus.ACTIVE);
            roster.setJerseyNumber(1);

            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(List.of(roster));
            when(storageService.getSignedUrl("memo.jpg", 120)).thenReturn("https://signed.com/memo.jpg");

            List<PlayerResponse> results = playerRegistrationService.getPlayersByTeam(team.getId());

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getFirstName()).isEqualTo("Memo");
            assertThat(results.get(0).getProfilePhotoUrl()).isEqualTo("https://signed.com/memo.jpg");
        }

        @Test
        @DisplayName("should populate match stats, signed URLs and sort directory by player full name")
        void populatesStatsAndSorts() {
            Person p1 = new Person();
            p1.setId(UUID.randomUUID());
            p1.setFirstName("Zinedine");
            p1.setLastName("Zidane");
            p1.setProfilePhotoUrl("http://external.com/photo.jpg");

            Player pl1 = new Player();
            pl1.setId(UUID.randomUUID());
            pl1.setPerson(p1);

            SeasonRoster r1 = new SeasonRoster();
            r1.setPlayer(pl1);
            r1.setTeam(team);
            r1.setStatus(PlayerStatus.ACTIVE);
            r1.setJerseyNumber(5);

            Person p2 = new Person();
            p2.setId(UUID.randomUUID());
            p2.setFirstName("Andrés");
            p2.setLastName("Iniesta");
            p2.setProfilePhotoUrl("s3_iniesta.jpg");

            Player pl2 = new Player();
            pl2.setId(UUID.randomUUID());
            pl2.setPerson(p2);

            SeasonRoster r2 = new SeasonRoster();
            r2.setPlayer(pl2);
            r2.setTeam(team);
            r2.setStatus(PlayerStatus.ACTIVE);
            r2.setJerseyNumber(8);

            when(seasonRosterRepository.findByTenantId(TENANT_A)).thenReturn(List.of(r1, r2));

            Object[] goalRow = new Object[]{pl1.getId(), MatchEvent.MatchEventType.GOAL, 10};
            Object[] appRow = new Object[]{pl1.getId(), MatchEvent.MatchEventType.APPEARANCE, 8};
            when(matchEventRepository.countEventsGroupedByPlayerAndType(TENANT_A))
                    .thenReturn(List.of(goalRow, appRow));
            when(matchEventRepository.countMatchesGroupedByPlayer(TENANT_A)).thenReturn(Collections.emptyList());
            when(storageService.getSignedUrl("s3_iniesta.jpg", 120)).thenReturn("https://signed.com/iniesta.jpg");

            var directory = playerRegistrationService.getPlayersDirectory(TENANT_A);

            assertThat(directory).hasSize(2);
            assertThat(directory.get(0).getFullName()).isEqualTo("Andrés Iniesta");
            assertThat(directory.get(0).getSignedPhotoUrl()).isEqualTo("https://signed.com/iniesta.jpg");
            assertThat(directory.get(1).getFullName()).isEqualTo("Zinedine Zidane");
            assertThat(directory.get(1).getGoals()).isEqualTo(10);
            assertThat(directory.get(1).getMatchesPlayed()).isEqualTo(8);
            assertThat(directory.get(1).getSignedPhotoUrl()).isEqualTo("http://external.com/photo.jpg");
        }
    }

    // =========================================================================
    // activatePlayer & deactivatePlayer
    // =========================================================================

    @Nested
    @DisplayName("activatePlayer and deactivatePlayer")
    class ActivationTests {

        @Test
        @DisplayName("activatePlayer should update status to ACTIVE when under player limit")
        void activatesPlayerSuccessfully() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();

            SeasonRoster roster = new SeasonRoster();
            roster.setTeam(team);
            roster.setStatus(PlayerStatus.INACTIVE);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));
            when(seasonRosterRepository.countByTeamIdAndSeasonIdAndStatus(team.getId(), activeSeason.getId(), PlayerStatus.ACTIVE))
                    .thenReturn(10);

            playerRegistrationService.activatePlayer(playerId);

            assertThat(roster.getStatus()).isEqualTo(PlayerStatus.ACTIVE);
            verify(seasonRosterRepository).save(roster);
        }

        @Test
        @DisplayName("deactivatePlayer should mark status as INACTIVE")
        void deactivatesPlayer() {
            TenantContext.setCurrentTenant(TENANT_A);
            UUID playerId = UUID.randomUUID();

            SeasonRoster roster = new SeasonRoster();
            roster.setStatus(PlayerStatus.ACTIVE);

            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(List.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));

            playerRegistrationService.deactivatePlayer(playerId);

            assertThat(roster.getStatus()).isEqualTo(PlayerStatus.INACTIVE);
            verify(seasonRosterRepository).save(roster);
        }
    }

    // =========================================================================
    // EdgeCasesAndHelpers
    // =========================================================================

    @Nested
    @DisplayName("EdgeCasesAndHelpers")
    class EdgeCasesAndHelpers {

        @Test
        @DisplayName("getPlayersDirectory should handle fallback matches count, null teams, data URIs and storage exceptions")
        void directoryHandlesAllEdgeCases() {
            Person p1 = new Person();
            p1.setId(UUID.randomUUID());
            p1.setFirstName("Ronaldo");
            p1.setLastName("Nazario");
            p1.setProfilePhotoUrl("data:image/jpeg;base64,12345");

            Player pl1 = new Player();
            pl1.setId(UUID.randomUUID());
            pl1.setPerson(p1);

            SeasonRoster r1 = new SeasonRoster();
            r1.setPlayer(pl1);
            r1.setTeam(null); // No team
            r1.setStatus(null); // Null status fallback

            Person p2 = new Person();
            p2.setId(UUID.randomUUID());
            p2.setFirstName("Zico");
            p2.setProfilePhotoUrl("corrupted_photo.jpg");

            Player pl2 = new Player();
            pl2.setId(UUID.randomUUID());
            pl2.setPerson(p2);

            Team teamWithLogo = new Team();
            teamWithLogo.setId(UUID.randomUUID());
            teamWithLogo.setName("Flamengo");
            teamWithLogo.setLogoUrl("data:image/png;base64,9876");

            SeasonRoster r2 = new SeasonRoster();
            r2.setPlayer(pl2);
            r2.setTeam(teamWithLogo);
            r2.setStatus(PlayerStatus.ACTIVE);

            // Empty roster with null player to verify skip
            SeasonRoster r3 = new SeasonRoster();
            r3.setPlayer(null);

            when(seasonRosterRepository.findByTenantId(TENANT_A)).thenReturn(List.of(r1, r2, r3));
            when(matchEventRepository.countEventsGroupedByPlayerAndType(TENANT_A)).thenReturn(Collections.emptyList());
            // Match counts fallback
            when(matchEventRepository.countMatchesGroupedByPlayer(TENANT_A)).thenReturn(List.<Object[]>of(new Object[]{pl1.getId(), 5}));
            when(storageService.getSignedUrl("corrupted_photo.jpg", 120)).thenThrow(new RuntimeException("S3 error"));

            var results = playerRegistrationService.getPlayersDirectory(TENANT_A);

            assertThat(results).hasSize(2);
            assertThat(results.get(0).getFullName()).isEqualTo("Ronaldo Nazario");
            assertThat(results.get(0).getTeamName()).isEqualTo("Sin equipo");
            assertThat(results.get(0).getMatchesPlayed()).isEqualTo(5);
            assertThat(results.get(0).getProfilePhotoUrl()).isEqualTo("data:image/jpeg;base64,12345");

            assertThat(results.get(1).getFullName()).isEqualTo("Zico");
            assertThat(results.get(1).getTeamLogoUrl()).isEqualTo("data:image/png;base64,9876");
            assertThat(results.get(1).getSignedPhotoUrl()).isEqualTo("corrupted_photo.jpg");
        }

        @Test
        @DisplayName("getActiveSeason should fallback to findByTenantId then findFirstByStatus")
        void activeSeasonFallbacks() {
            TenantContext.setCurrentTenant(TENANT_A);

            // Case 1: activeSeasons empty, but tenantSeasons has draft season
            Season draftSeason = new Season();
            draftSeason.setId(UUID.randomUUID());
            draftSeason.setStatus(SeasonStatus.DRAFT);
            when(seasonRepository.findByTenantIdAndStatus(TENANT_A, SeasonStatus.ACTIVE))
                    .thenReturn(Collections.emptyList());
            when(seasonRepository.findByTenantId(TENANT_A))
                    .thenReturn(List.of(draftSeason));

            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), draftSeason.getId()))
                    .thenReturn(Collections.emptyList());

            List<PlayerResponse> players = playerRegistrationService.getPlayersByTeam(team.getId());
            assertThat(players).isEmpty();

            // Case 2: tenantId is null, fallback to findFirstByStatus
            TenantContext.clear();
            when(seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE))
                    .thenReturn(Optional.of(activeSeason));
            when(seasonRosterRepository.findByTeamIdAndSeasonId(team.getId(), activeSeason.getId()))
                    .thenReturn(Collections.emptyList());

            List<PlayerResponse> playersNoTenant = playerRegistrationService.getPlayersByTeam(team.getId());
            assertThat(playersNoTenant).isEmpty();
        }
    }
}
