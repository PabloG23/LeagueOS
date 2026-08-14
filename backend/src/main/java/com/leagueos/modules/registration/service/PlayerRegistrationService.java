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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
        List<SeasonRoster> existingRosters = List.of();

        if (team != null) {
            activeSeason = getActiveSeason();
            existingRosters = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId());

            validateActivePlayerLimit(activeSeason, teamId, existingRosters, 0);
            validateNoDuplicateName(firstName, lastName, existingRosters, List.of());
            validateJerseyNumber(request.getJerseyNumber(), existingRosters, List.of());
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

        validateActivePlayerLimit(activeSeason, teamId, existingRosters, validRequests.size());

        // Accumulate new rosters in-memory to detect intra-batch duplicates
        List<SeasonRoster> pendingRosters = new ArrayList<>();
        List<Person> newPersons = new ArrayList<>();
        List<Player> newPlayers = new ArrayList<>();

        for (BatchPlayerRegistrationRequest request : validRequests) {
            String firstName = normalizeUpperCase(request.getFirstName());
            String lastName = normalizeUpperCase(request.getLastName());

            validateNoDuplicateName(firstName, lastName, existingRosters, pendingRosters);
            if (settings.isRequireJerseyNumbers()) {
                validateJerseyNumber(request.getJerseyNumber(), existingRosters, pendingRosters);
            }

            Person person = buildAndSavePerson(firstName, lastName.isEmpty() ? null : lastName, request.getBirthDate(), null, tenantId);
            Player player = buildAndSavePlayer(person, tenantId);
            newPersons.add(person);
            newPlayers.add(player);

            SeasonRoster roster = buildRoster(player, team, activeSeason, request.getJerseyNumber(), tenantId);
            pendingRosters.add(roster);
        }

        seasonRosterRepository.saveAll(pendingRosters);

        List<PlayerResponse> responses = new ArrayList<>();
        for (int i = 0; i < newPlayers.size(); i++) {
            responses.add(mapToResponse(newPlayers.get(i), pendingRosters.get(i)));
        }
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

    private void validateActivePlayerLimit(Season season, UUID teamId, List<SeasonRoster> existing, int incoming) {
        long current = existing.stream().filter(r -> r.getStatus() == PlayerStatus.ACTIVE).count();
        if (current + incoming >= season.getMaxActivePlayersPerTeam()) {
            throw new BusinessRuleException(
                    "El equipo ya ha alcanzado el límite máximo de " + season.getMaxActivePlayersPerTeam() + " jugadores activos."
            );
        }
    }

    private void validateNoDuplicateName(String firstName, String lastName,
                                          List<SeasonRoster> existing, List<SeasonRoster> pending) {
        boolean duplicate = Stream.concat(existing.stream(), pending.stream())
                .anyMatch(r -> {
                    String pFirst = r.getPlayer().getPerson().getFirstName();
                    String pLast = r.getPlayer().getPerson().getLastName();
                    pLast = pLast != null ? pLast : "";
                    return pFirst.equalsIgnoreCase(firstName) && pLast.equalsIgnoreCase(lastName);
                });
        if (duplicate) {
            throw new BusinessRuleException("El jugador '" + firstName + " " + lastName + "' ya existe en el equipo.");
        }
    }

    private void validateJerseyNumber(Integer jerseyNumber,
                                       List<SeasonRoster> existing, List<SeasonRoster> pending) {
        TenantSettings settings = tenantSettingsService.getCurrentSettings();
        if (!settings.isRequireJerseyNumbers()) return;

        if (jerseyNumber == null) {
            throw new BusinessRuleException("El número de playera/dorsal es obligatorio en esta liga.");
        }

        boolean duplicate = Stream.concat(existing.stream(), pending.stream())
                .anyMatch(r -> r.getStatus() == PlayerStatus.ACTIVE
                        && r.getJerseyNumber() != null
                        && r.getJerseyNumber().equals(jerseyNumber));
        if (duplicate) {
            throw new BusinessRuleException("El dorsal " + jerseyNumber + " ya está ocupado por otro jugador activo en el equipo.");
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
