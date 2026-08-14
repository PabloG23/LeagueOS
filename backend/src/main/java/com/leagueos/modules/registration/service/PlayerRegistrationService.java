package com.leagueos.modules.registration.service;

import com.leagueos.modules.league.domain.Person;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.PersonRepository;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
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
import com.leagueos.shared.domain.exception.BusinessRuleException;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlayerRegistrationService {

    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;
    private final PersonRepository personRepository;
    private final TenantSettingsService tenantSettingsService;
    private final SeasonRosterRepository seasonRosterRepository;

    @Transactional
    public void activatePlayer(UUID playerId) {
        Season activeSeason = getActiveSeason();

        SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Player is not assigned to a team in the active season"));

        int currentActivePlayers = seasonRosterRepository.countByTeamIdAndSeasonIdAndStatus(
                roster.getTeam().getId(),
                activeSeason.getId(),
                PlayerStatus.ACTIVE
        );

        if (currentActivePlayers >= activeSeason.getMaxActivePlayersPerTeam()) {
            throw new BusinessRuleException(
                    "Team has reached the maximum number of active players (" + activeSeason.getMaxActivePlayersPerTeam() + ")"
            );
        }

        roster.setStatus(PlayerStatus.ACTIVE);
        seasonRosterRepository.save(roster);
    }

    @Transactional
    public void deactivatePlayer(UUID playerId) {
        Season activeSeason = getActiveSeason();

        SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Player roster not found for active season"));

        roster.setStatus(PlayerStatus.INACTIVE);
        seasonRosterRepository.save(roster);
    }

    @Transactional
    public PlayerResponse registerPlayer(PlayerRegistrationRequest request, UUID defaultTeamId, UUID tenantId) {
        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
            throw new BusinessRuleException("El nombre del jugador es obligatorio.");
        }

        UUID teamId = request.getTeamId() != null ? request.getTeamId() : defaultTeamId;
        Team team = teamId != null
                ? teamRepository.findById(teamId).orElseThrow(() -> new ResourceNotFoundException("Team not found"))
                : null;

        String firstName = normalizeUpperCase(request.getFirstName());
        String lastName = normalizeUpperCase(request.getLastName());

        Season activeSeason = null;
        if (team != null) {
            activeSeason = getActiveSeason();
            List<SeasonRoster> existingRosters = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId());

            validateActivePlayerLimit(activeSeason, teamId, existingRosters.size(), 0);

            Set<String> existingNames = extractNamesSet(existingRosters);
            if (existingNames.contains(buildFullNameKey(firstName, lastName))) {
                throw new BusinessRuleException("El jugador '" + firstName + " " + lastName + "' ya existe en el equipo.");
            }

            TenantSettings settings = tenantSettingsService.getCurrentSettings();
            if (settings.isRequireJerseyNumbers()) {
                if (request.getJerseyNumber() == null) {
                    throw new BusinessRuleException("El número de playera/dorsal es obligatorio en esta liga.");
                }
                Set<Integer> existingJerseys = extractActiveJerseySet(existingRosters);
                if (existingJerseys.contains(request.getJerseyNumber())) {
                    throw new BusinessRuleException("El dorsal " + request.getJerseyNumber() + " ya está ocupado por otro jugador activo en el equipo.");
                }
            }
        }

        Person person = buildAndSavePerson(firstName, lastName, request.getBirthDate(), request.getProfilePhotoUrl(), tenantId);
        Player player = buildAndSavePlayer(person, tenantId);

        if (team != null && activeSeason != null) {
            SeasonRoster roster = buildRoster(player, team, activeSeason, request.getJerseyNumber(), tenantId);
            seasonRosterRepository.save(roster);
            return mapToResponse(player, roster);
        }

        return mapToResponse(player, null);
    }

    @Transactional
    public List<PlayerResponse> registerPlayersBatch(List<BatchPlayerRegistrationRequest> requests, UUID teamId, UUID tenantId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));

        Season activeSeason = getActiveSeason();
        TenantSettings settings = tenantSettingsService.getCurrentSettings();
        List<SeasonRoster> existingRosters = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId());

        List<BatchPlayerRegistrationRequest> validRequests = requests.stream()
                .filter(r -> r.getFirstName() != null && !r.getFirstName().trim().isEmpty())
                .toList();

        if (validRequests.isEmpty()) {
            throw new BusinessRuleException("El archivo no contiene jugadores válidos.");
        }

        long currentActiveCount = existingRosters.stream().filter(r -> r.getStatus() == PlayerStatus.ACTIVE).count();
        if (currentActiveCount + validRequests.size() > activeSeason.getMaxActivePlayersPerTeam()) {
            throw new BusinessRuleException(
                    "El equipo ya ha alcanzado el límite máximo de " + activeSeason.getMaxActivePlayersPerTeam() + " jugadores activos."
            );
        }

        // Sets for O(1) duplicate checks instead of repeating Stream.concat
        Set<String> knownNames = extractNamesSet(existingRosters);
        Set<Integer> activeJerseys = settings.isRequireJerseyNumbers() ? extractActiveJerseySet(existingRosters) : null;

        List<SeasonRoster> pendingRosters = new ArrayList<>(validRequests.size());
        List<PlayerResponse> responses = new ArrayList<>(validRequests.size());

        for (BatchPlayerRegistrationRequest request : validRequests) {
            String firstName = normalizeUpperCase(request.getFirstName());
            String lastName = normalizeUpperCase(request.getLastName());
            String nameKey = buildFullNameKey(firstName, lastName);

            if (!knownNames.add(nameKey)) {
                throw new BusinessRuleException("El jugador '" + firstName + " " + lastName + "' ya existe en el equipo.");
            }

            if (settings.isRequireJerseyNumbers()) {
                if (request.getJerseyNumber() == null) {
                    throw new BusinessRuleException("El número de playera/dorsal es obligatorio en esta liga.");
                }
                if (!activeJerseys.add(request.getJerseyNumber())) {
                    throw new BusinessRuleException("El dorsal " + request.getJerseyNumber() + " ya está ocupado por otro jugador activo en el equipo.");
                }
            }

            Person person = buildAndSavePerson(firstName, lastName.isEmpty() ? null : lastName, request.getBirthDate(), null, tenantId);
            Player player = buildAndSavePlayer(person, tenantId);
            SeasonRoster roster = buildRoster(player, team, activeSeason, request.getJerseyNumber(), tenantId);
            pendingRosters.add(roster);

            responses.add(mapToResponse(player, roster));
        }

        seasonRosterRepository.saveAll(pendingRosters);
        return responses;
    }

    @Transactional(readOnly = true)
    public List<PlayerResponse> getPlayersByTeam(UUID teamId) {
        return seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)
                .map(season -> seasonRosterRepository.findByTeamIdAndSeasonId(teamId, season.getId()).stream()
                        .map(roster -> mapToResponse(roster.getPlayer(), roster))
                        .collect(Collectors.toList()))
                .orElse(List.of());
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Season getActiveSeason() {
        return seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active season found"));
    }

    private static String normalizeUpperCase(String value) {
        return value != null ? value.trim().toUpperCase() : "";
    }

    private static String buildFullNameKey(String firstName, String lastName) {
        return firstName + "|" + (lastName != null ? lastName : "");
    }

    private Set<String> extractNamesSet(List<SeasonRoster> rosters) {
        Set<String> set = new HashSet<>(rosters.size());
        for (SeasonRoster r : rosters) {
            if (r.getPlayer() != null && r.getPlayer().getPerson() != null) {
                String first = normalizeUpperCase(r.getPlayer().getPerson().getFirstName());
                String last = normalizeUpperCase(r.getPlayer().getPerson().getLastName());
                set.add(buildFullNameKey(first, last));
            }
        }
        return set;
    }

    private Set<Integer> extractActiveJerseySet(List<SeasonRoster> rosters) {
        Set<Integer> set = new HashSet<>();
        for (SeasonRoster r : rosters) {
            if (r.getStatus() == PlayerStatus.ACTIVE && r.getJerseyNumber() != null) {
                set.add(r.getJerseyNumber());
            }
        }
        return set;
    }

    private void validateActivePlayerLimit(Season season, UUID teamId, int current, int incoming) {
        if (current + incoming >= season.getMaxActivePlayersPerTeam()) {
            throw new BusinessRuleException(
                    "El equipo ya ha alcanzado el límite máximo de " + season.getMaxActivePlayersPerTeam() + " jugadores activos."
            );
        }
    }

    private Person buildAndSavePerson(String firstName, String lastName, java.time.LocalDate birthDate, String photoUrl, UUID tenantId) {
        Person person = new Person();
        person.setFirstName(firstName);
        person.setLastName(lastName != null && lastName.isEmpty() ? null : lastName);
        person.setBirthDate(birthDate);
        person.setProfilePhotoUrl(photoUrl);
        person.setTenantId(tenantId);
        return personRepository.save(person);
    }

    private Player buildAndSavePlayer(Person person, UUID tenantId) {
        Player player = new Player();
        player.setPerson(person);
        player.setTenantId(tenantId);
        return playerRepository.save(player);
    }

    private SeasonRoster buildRoster(Player player, Team team, Season season, Integer jerseyNumber, UUID tenantId) {
        SeasonRoster roster = new SeasonRoster();
        roster.setPlayer(player);
        roster.setTeam(team);
        roster.setSeason(season);
        roster.setStatus(PlayerStatus.ACTIVE);
        roster.setJerseyNumber(jerseyNumber);
        roster.setTenantId(tenantId);
        return roster;
    }

    private PlayerResponse mapToResponse(Player player, SeasonRoster roster) {
        PlayerResponse response = new PlayerResponse();
        response.setId(player.getId());
        if (player.getPerson() != null) {
            response.setFirstName(player.getPerson().getFirstName());
            response.setLastName(player.getPerson().getLastName());
            response.setBirthDate(player.getPerson().getBirthDate());
            response.setProfilePhotoUrl(player.getPerson().getProfilePhotoUrl());
        }
        if (roster != null) {
            response.setStatus(roster.getStatus());
            response.setJerseyNumber(roster.getJerseyNumber());
            response.setTeamId(roster.getTeam().getId());
        }
        return response;
    }
}
