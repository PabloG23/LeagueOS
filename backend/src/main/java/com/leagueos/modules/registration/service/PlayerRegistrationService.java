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
import com.leagueos.shared.util.NameUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

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
    private final com.leagueos.modules.media.service.StorageService storageService;

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

    @Transactional(readOnly = true)
    public void validateRegistrationPreconditions(PlayerRegistrationRequest request, UUID defaultTeamId, UUID tenantId) {
        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
            throw new BusinessRuleException("El nombre del jugador es obligatorio.");
        }

        UUID teamId = request.getTeamId() != null ? request.getTeamId() : defaultTeamId;
        String firstName = normalizeUpperCase(request.getFirstName());
        String lastName = normalizeUpperCase(request.getLastName());
        TenantSettings settings = tenantSettingsService.getCurrentSettings();

        boolean isForeign = Boolean.TRUE.equals(request.getIsForeign());

        // Step 1: Early CURP validation and requirement check (foreign players do not require or use CURP)
        if (!isForeign) {
            if (request.getCurp() != null && !request.getCurp().trim().isEmpty()) {
                String curpUpper = request.getCurp().trim().toUpperCase();
                if (!CurpUtils.isValid(curpUpper)) {
                    throw new BusinessRuleException("El CURP ingresado ('" + curpUpper + "') no tiene un formato válido o su dígito verificador es incorrecto.");
                }
            } else if (settings.isRequireCurp()) {
                throw new BusinessRuleException("El CURP es obligatorio para registrar jugadores en esta liga.");
            }
        }

        if (teamId != null) {
            Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
            Season activeSeason = getActiveSeason();
            List<SeasonRoster> existingRosters = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId());

            // Step 2: Check if player already exists and is active in the same team
            Optional<SeasonRoster> existingRosterOpt = existingRosters.stream()
                    .filter(r -> {
                        Person p = r.getPlayer() != null ? r.getPlayer().getPerson() : null;
                        if (p == null) return false;
                        if (request.getCurp() != null && !request.getCurp().isBlank() && request.getCurp().equalsIgnoreCase(p.getCurp())) {
                            return true;
                        }
                        return buildFullNameKey(firstName, lastName).equalsIgnoreCase(
                                buildFullNameKey(normalizeUpperCase(p.getFirstName()), normalizeUpperCase(p.getLastName())));
                    })
                    .findFirst();

            if (existingRosterOpt.isPresent()) {
                SeasonRoster existingRoster = existingRosterOpt.get();
                if (existingRoster.getStatus() == PlayerStatus.ACTIVE) {
                    throw new BusinessRuleException("El jugador '" + firstName + (lastName != null && !lastName.isBlank() ? " " + lastName : "") + "' ya se encuentra registrado y activo en este equipo.");
                }
            }

            // Step 3: Validate duplicate across different teams in the active season
            if (!settings.isAllowMultipleTeamsPerPlayer()) {
                List<SeasonRoster> allSeasonRosters = seasonRosterRepository.findBySeasonId(activeSeason.getId());
                Optional<SeasonRoster> conflict = allSeasonRosters.stream()
                        .filter(r -> !r.getTeam().getId().equals(teamId)) // excluding current team
                        .filter(r -> {
                            Person p = r.getPlayer() != null ? r.getPlayer().getPerson() : null;
                            if (p == null) return false;
                            if (request.getCurp() != null && !request.getCurp().isBlank() && request.getCurp().equalsIgnoreCase(p.getCurp())) {
                                return true;
                            }
                            return buildFullNameKey(firstName, lastName).equalsIgnoreCase(
                                    buildFullNameKey(normalizeUpperCase(p.getFirstName()), normalizeUpperCase(p.getLastName())));
                        })
                        .findFirst();
                if (conflict.isPresent()) {
                    String conflictTeamName = conflict.get().getTeam() != null ? conflict.get().getTeam().getName() : "otro equipo";
                    throw new BusinessRuleException("El jugador ya está registrado en el equipo '" + conflictTeamName + "'. No se permite registrar al mismo jugador en múltiples equipos de esta liga.");
                }
            }

            validateActivePlayerLimit(activeSeason, teamId, existingRosters.size(), 0);

            if (request.getJerseyNumber() == null) {
                throw new BusinessRuleException("El número de playera/dorsal es obligatorio.");
            }
            Set<Integer> existingJerseys = extractActiveJerseySet(existingRosters);
            if (existingJerseys.contains(request.getJerseyNumber())) {
                throw new BusinessRuleException("El dorsal " + request.getJerseyNumber() + " ya está ocupado por otro jugador en el equipo.");
            }
        }
    }

    @Transactional
    public PlayerResponse registerPlayer(PlayerRegistrationRequest request, UUID defaultTeamId, UUID tenantId) {
        validateRegistrationPreconditions(request, defaultTeamId, tenantId);

        UUID teamId = request.getTeamId() != null ? request.getTeamId() : defaultTeamId;
        Team team = teamId != null ? teamRepository.findById(teamId).orElse(null) : null;

        String firstName = normalizeUpperCase(request.getFirstName());
        String lastName = normalizeUpperCase(request.getLastName());
        boolean isForeign = Boolean.TRUE.equals(request.getIsForeign());

        if (!isForeign && request.getCurp() != null && !request.getCurp().trim().isEmpty()) {
            request.setCurp(request.getCurp().trim().toUpperCase());
        } else {
            request.setCurp(null);
        }

        Season activeSeason = null;
        if (team != null) {
            activeSeason = getActiveSeason();
            List<SeasonRoster> existingRosters = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId());

            Optional<SeasonRoster> existingRosterOpt = existingRosters.stream()
                    .filter(r -> {
                        Person p = r.getPlayer() != null ? r.getPlayer().getPerson() : null;
                        if (p == null) return false;
                        if (request.getCurp() != null && !request.getCurp().isBlank() && request.getCurp().equalsIgnoreCase(p.getCurp())) {
                            return true;
                        }
                        return buildFullNameKey(firstName, lastName).equalsIgnoreCase(
                                buildFullNameKey(normalizeUpperCase(p.getFirstName()), normalizeUpperCase(p.getLastName())));
                    })
                    .findFirst();

            if (existingRosterOpt.isPresent()) {
                SeasonRoster existingRoster = existingRosterOpt.get();
                if (existingRoster.getStatus() == PlayerStatus.PENDING_VERIFICATION) {
                    return verifyPlayer(existingRoster.getPlayer().getId(), request, tenantId);
                }
            }
        }

        Person person = buildAndSavePerson(firstName, lastName, request.getCurp(), request.getBirthDate(), request.getProfilePhotoUrl(), tenantId);
        Player player = buildAndSavePlayer(person, tenantId);

        if (team != null && activeSeason != null) {
            SeasonRoster roster = buildRoster(player, team, activeSeason, request.getJerseyNumber(), PlayerStatus.ACTIVE, tenantId);
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
        Set<Integer> activeJerseys = extractActiveJerseySet(existingRosters);

        List<SeasonRoster> pendingRosters = new ArrayList<>(validRequests.size());
        List<PlayerResponse> responses = new ArrayList<>(validRequests.size());

        for (BatchPlayerRegistrationRequest request : validRequests) {
            String firstName = normalizeUpperCase(request.getFirstName());
            String lastName = normalizeUpperCase(request.getLastName());
            String nameKey = buildFullNameKey(firstName, lastName);

            if (!knownNames.add(nameKey)) {
                throw new BusinessRuleException("El jugador '" + firstName + " " + lastName + "' ya existe en el equipo.");
            }

            boolean isForeign = Boolean.TRUE.equals(request.getIsForeign());
            if (!isForeign && request.getCurp() != null && !request.getCurp().trim().isEmpty()) {
                String curpUpper = request.getCurp().trim().toUpperCase();
                if (!CurpUtils.isValid(curpUpper)) {
                    throw new BusinessRuleException("El CURP ingresado ('" + curpUpper + "') para '" + firstName + " " + lastName + "' no es válido o su dígito verificador es incorrecto.");
                }
                request.setCurp(curpUpper);
            } else {
                request.setCurp(null);
            }

            if (!settings.isAllowMultipleTeamsPerPlayer()) {
                List<SeasonRoster> allSeasonRosters = seasonRosterRepository.findBySeasonId(activeSeason.getId());
                Optional<SeasonRoster> conflict = allSeasonRosters.stream()
                        .filter(r -> !r.getTeam().getId().equals(teamId))
                        .filter(r -> {
                            Person p = r.getPlayer() != null ? r.getPlayer().getPerson() : null;
                            if (p == null) return false;
                            if (request.getCurp() != null && !request.getCurp().isBlank() && request.getCurp().equalsIgnoreCase(p.getCurp())) {
                                return true;
                            }
                            return buildFullNameKey(firstName, lastName).equalsIgnoreCase(
                                    buildFullNameKey(normalizeUpperCase(p.getFirstName()), normalizeUpperCase(p.getLastName())));
                        })
                        .findFirst();
                if (conflict.isPresent()) {
                    String conflictTeamName = conflict.get().getTeam() != null ? conflict.get().getTeam().getName() : "otro equipo";
                    throw new BusinessRuleException("El jugador '" + firstName + " " + lastName + "' ya está registrado en el equipo '" + conflictTeamName + "'. No se permite registrar al mismo jugador en múltiples equipos de esta liga.");
                }
            }

            if (request.getJerseyNumber() != null) {
                if (!activeJerseys.add(request.getJerseyNumber())) {
                    throw new BusinessRuleException("El dorsal " + request.getJerseyNumber() + " ya está ocupado por otro jugador en el equipo.");
                }
            }

            Person person = buildAndSavePerson(firstName, lastName.isEmpty() ? null : lastName, request.getCurp(), request.getBirthDate(), null, tenantId);
            Player player = buildAndSavePlayer(person, tenantId);
            SeasonRoster roster = buildRoster(player, team, activeSeason, request.getJerseyNumber(), PlayerStatus.PENDING_VERIFICATION, tenantId);
            pendingRosters.add(roster);

            responses.add(mapToResponse(player, roster));
        }

        seasonRosterRepository.saveAll(pendingRosters);
        return responses;
    }

    @Transactional(readOnly = true)
    public void validateVerificationPreconditions(UUID playerId, PlayerRegistrationRequest request, UUID tenantId) {
        Season activeSeason = getActiveSeason();
        SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Player is not assigned to a team in the active season"));

        UUID teamId = roster.getTeam().getId();
        TenantSettings settings = tenantSettingsService.getCurrentSettings();

        String firstName = normalizeUpperCase(request.getFirstName());
        String lastName = normalizeUpperCase(request.getLastName());
        String curpUpper = request.getCurp() != null ? request.getCurp().trim().toUpperCase() : null;

        // Validate that the identity on the document matches the registered pending player
        Person existingPerson = roster.getPlayer() != null ? roster.getPlayer().getPerson() : null;
        if (existingPerson != null && existingPerson.getFirstName() != null && !existingPerson.getFirstName().isBlank()) {
            boolean nameMatches = NameUtils.isNameCompatible(
                    existingPerson.getFirstName(),
                    existingPerson.getLastName(),
                    firstName,
                    lastName
            );
            if (!nameMatches) {
                String existingFullName = (existingPerson.getFirstName() + " " + (existingPerson.getLastName() != null ? existingPerson.getLastName() : "")).trim();
                String scannedFullName = (firstName + " " + (lastName != null ? lastName : "")).trim();
                throw new BusinessRuleException(
                        "El nombre en la identificación ('" + scannedFullName + "') no coincide con el jugador registrado en la plantilla ('" + existingFullName + "')."
                );
            }
        }

        if (curpUpper != null && !curpUpper.isEmpty()) {
            if (!CurpUtils.isValid(curpUpper)) {
                throw new BusinessRuleException("El CURP extraído ('" + curpUpper + "') no tiene un formato válido o su dígito verificador es incorrecto.");
            }
        } else if (settings.isRequireCurp() && !Boolean.TRUE.equals(request.getIsForeign())) {
            throw new BusinessRuleException("El CURP es obligatorio para verificar y activar al jugador.");
        }

        // Validate multi-team conflict across the league
        if (!settings.isAllowMultipleTeamsPerPlayer()) {
            List<SeasonRoster> allSeasonRosters = seasonRosterRepository.findBySeasonId(activeSeason.getId());
            Optional<SeasonRoster> conflict = allSeasonRosters.stream()
                    .filter(r -> !r.getTeam().getId().equals(teamId))
                    .filter(r -> {
                        Person p = r.getPlayer() != null ? r.getPlayer().getPerson() : null;
                        if (p == null) return false;
                        if (curpUpper != null && !curpUpper.isBlank() && curpUpper.equalsIgnoreCase(p.getCurp())) {
                            return true;
                        }
                        return buildFullNameKey(firstName, lastName).equalsIgnoreCase(
                                buildFullNameKey(normalizeUpperCase(p.getFirstName()), normalizeUpperCase(p.getLastName())));
                    })
                    .findFirst();
            if (conflict.isPresent()) {
                String conflictTeamName = conflict.get().getTeam() != null ? conflict.get().getTeam().getName() : "otro equipo";
                throw new BusinessRuleException("El jugador ya está registrado en el equipo '" + conflictTeamName + "'. No se permite registrar al mismo jugador en múltiples equipos de esta liga.");
            }
        }

        // Validate duplicate against other ACTIVE players in the SAME team
        List<SeasonRoster> sameTeamRosters = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId());
        boolean duplicateInTeam = sameTeamRosters.stream()
                .filter(r -> !r.getPlayer().getId().equals(playerId))
                .filter(r -> r.getStatus() == PlayerStatus.ACTIVE)
                .anyMatch(r -> {
                    Person p = r.getPlayer() != null ? r.getPlayer().getPerson() : null;
                    if (p == null) return false;
                    if (curpUpper != null && !curpUpper.isBlank() && curpUpper.equalsIgnoreCase(p.getCurp())) {
                        return true;
                    }
                    return buildFullNameKey(firstName, lastName).equalsIgnoreCase(
                            buildFullNameKey(normalizeUpperCase(p.getFirstName()), normalizeUpperCase(p.getLastName())));
                });
        if (duplicateInTeam) {
            throw new BusinessRuleException("Ya existe otro jugador activo registrado con los mismos datos en este equipo.");
        }

        // Validate jersey number uniqueness against other players in the team
        if (request.getJerseyNumber() != null) {
            boolean jerseyTaken = sameTeamRosters.stream()
                    .filter(r -> !r.getPlayer().getId().equals(playerId))
                    .filter(r -> r.getStatus() != PlayerStatus.INACTIVE)
                    .anyMatch(r -> request.getJerseyNumber().equals(r.getJerseyNumber()));
            if (jerseyTaken) {
                throw new BusinessRuleException("El dorsal " + request.getJerseyNumber() + " ya está ocupado por otro jugador en el equipo.");
            }
        }
    }

    @Transactional
    public PlayerResponse verifyPlayer(UUID playerId, PlayerRegistrationRequest request, UUID tenantId) {
        validateVerificationPreconditions(playerId, request, tenantId);

        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player not found"));
        
        Person person = player.getPerson();
        if (request.getCurp() != null && !request.getCurp().trim().isEmpty()) {
            person.setCurp(request.getCurp().trim().toUpperCase());
        }
        person.setFirstName(normalizeUpperCase(request.getFirstName()));
        
        String lastName = request.getLastName();
        person.setLastName(lastName != null && lastName.isEmpty() ? null : normalizeUpperCase(lastName));
        
        if (request.getBirthDate() != null) {
            person.setBirthDate(request.getBirthDate());
        }
        if (request.getProfilePhotoUrl() != null) {
            String oldPhoto = person.getProfilePhotoUrl();
            if (oldPhoto != null && !oldPhoto.isBlank() && !oldPhoto.equals(request.getProfilePhotoUrl())) {
                storageService.deleteFile(oldPhoto);
            }
            person.setProfilePhotoUrl(request.getProfilePhotoUrl());
        }
        personRepository.save(person);

        Season activeSeason = getActiveSeason();
        SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Player is not assigned to a team in the active season"));

        roster.setStatus(PlayerStatus.ACTIVE);
        if (request.getJerseyNumber() != null) {
            roster.setJerseyNumber(request.getJerseyNumber());
        }
        seasonRosterRepository.save(roster);

        return mapToResponse(player, roster);
    }

    @Transactional(readOnly = true)
    public List<PlayerResponse> getPlayersByTeam(UUID teamId) {
        Season season = getActiveSeason();
        if (season == null) {
            return List.of();
        }
        return seasonRosterRepository.findByTeamIdAndSeasonId(teamId, season.getId()).stream()
                .map(roster -> mapToResponse(roster.getPlayer(), roster))
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Season getActiveSeason() {
        UUID tenantId = com.leagueos.shared.context.TenantContext.getCurrentTenant();
        if (tenantId != null) {
            List<Season> activeSeasons = seasonRepository.findByTenantIdAndStatus(tenantId, SeasonStatus.ACTIVE);
            if (!activeSeasons.isEmpty()) {
                return activeSeasons.get(0);
            }
            List<Season> tenantSeasons = seasonRepository.findByTenantId(tenantId);
            if (!tenantSeasons.isEmpty()) {
                return tenantSeasons.get(0);
            }
        }
        return seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)
                .orElseGet(() -> {
                    UUID effectiveTenant = tenantId != null ? tenantId : UUID.fromString("11111111-1111-1111-1111-111111111111");
                    Season newSeason = new Season();
                    newSeason.setName("Temporada Regular 2026");
                    newSeason.setStatus(SeasonStatus.ACTIVE);
                    newSeason.setTenantId(effectiveTenant);
                    newSeason.setStartDate(java.time.LocalDate.now());
                    newSeason.setEndDate(java.time.LocalDate.now().plusMonths(6));
                    newSeason.setCurrentMatchday(1);
                    newSeason.setMaxActivePlayersPerTeam(30);
                    return seasonRepository.save(newSeason);
                });
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
            if (r.getStatus() != PlayerStatus.INACTIVE && r.getJerseyNumber() != null) {
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

    private Person buildAndSavePerson(String firstName, String lastName, String curp, java.time.LocalDate birthDate, String photoUrl, UUID tenantId) {
        Person person = new Person();
        person.setFirstName(firstName);
        person.setLastName(lastName != null && lastName.isEmpty() ? null : lastName);
        person.setCurp(curp);
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

    private SeasonRoster buildRoster(Player player, Team team, Season season, Integer jerseyNumber, PlayerStatus status, UUID tenantId) {
        SeasonRoster roster = new SeasonRoster();
        roster.setPlayer(player);
        roster.setTeam(team);
        roster.setSeason(season);
        roster.setStatus(status);
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
            response.setCurp(player.getPerson().getCurp());
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
