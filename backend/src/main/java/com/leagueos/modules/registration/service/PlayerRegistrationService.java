package com.leagueos.modules.registration.service;

import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlayerRegistrationService {

    private final PlayerRepository playerRepository;
    private final com.leagueos.modules.league.persistence.SeasonRepository seasonRepository;
    private final com.leagueos.modules.league.persistence.TeamRepository teamRepository;
    private final com.leagueos.modules.league.persistence.PersonRepository personRepository;
    private final com.leagueos.modules.tenant.service.TenantSettingsService tenantSettingsService;
    private final com.leagueos.modules.registration.persistence.SeasonRosterRepository seasonRosterRepository;

    @Transactional
    public void activatePlayer(UUID playerId) {
        com.leagueos.modules.league.domain.Season activeSeason = seasonRepository.findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("No active season found"));

        com.leagueos.modules.registration.domain.SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new RuntimeException("Player is not assigned to a team in the active season"));

        int currentActivePlayers = seasonRosterRepository.countByTeamIdAndSeasonIdAndStatus(
                roster.getTeam().getId(), 
                activeSeason.getId(),
                com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE
        );

        if (currentActivePlayers >= activeSeason.getMaxActivePlayersPerTeam()) {
            throw new com.leagueos.shared.domain.exception.BusinessRuleException(
                    "Team has reached the maximum number of active players (" + activeSeason.getMaxActivePlayersPerTeam() + ")"
            );
        }

        roster.setStatus(com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE);
        seasonRosterRepository.save(roster);
    }

    @Transactional
    public void deactivatePlayer(UUID playerId) {
        com.leagueos.modules.league.domain.Season activeSeason = seasonRepository.findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("No active season found"));

        com.leagueos.modules.registration.domain.SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new RuntimeException("Player roster not found for active season"));

        roster.setStatus(com.leagueos.modules.registration.domain.PlayerStatus.INACTIVE);
        seasonRosterRepository.save(roster);
    }

    @Transactional
    public com.leagueos.modules.registration.api.dto.PlayerResponse registerPlayer(com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest request, UUID defaultTeamId, UUID tenantId) {
        UUID teamId = request.getTeamId() != null ? request.getTeamId() : defaultTeamId;
        com.leagueos.modules.league.domain.Team team = null;
        if (teamId != null) {
            team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found"));
        }

        // Need the season to register the roster
        com.leagueos.modules.league.domain.Season activeSeason = null;
        if (team != null) {
            activeSeason = seasonRepository.findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("No active season found to register the player into."));
        }

        com.leagueos.modules.tenant.domain.TenantSettings settings = tenantSettingsService.getCurrentSettings();
        if (settings.isRequireJerseyNumbers() && activeSeason != null) {
            if (request.getJerseyNumber() == null) {
                throw new com.leagueos.shared.domain.exception.BusinessRuleException("El número de playera/dorsal es obligatorio en esta liga.");
            }
            if (teamId != null) {
                boolean duplicateExists = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId()).stream()
                        .anyMatch(r -> r.getStatus() == com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE
                                && r.getJerseyNumber() != null
                                && r.getJerseyNumber().equals(request.getJerseyNumber()));
                if (duplicateExists) {
                    throw new com.leagueos.shared.domain.exception.BusinessRuleException("El dorsal " + request.getJerseyNumber() + " ya está ocupado por otro jugador activo en el equipo.");
                }
            }
        }

        com.leagueos.modules.league.domain.Person person = new com.leagueos.modules.league.domain.Person();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setBirthDate(request.getBirthDate());
        person.setProfilePhotoUrl(request.getProfilePhotoUrl());
        person.setTenantId(tenantId);
        person = personRepository.save(person);

        Player player = new Player();
        player.setPerson(person);
        player.setTenantId(tenantId);
        player = playerRepository.save(player);

        if (team != null && activeSeason != null) {
            com.leagueos.modules.registration.domain.SeasonRoster roster = new com.leagueos.modules.registration.domain.SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);
            roster.setSeason(activeSeason);
            roster.setStatus(com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE);
            roster.setJerseyNumber(request.getJerseyNumber());
            roster.setTenantId(tenantId);
            seasonRosterRepository.save(roster);
            
            // For now DTO maps via direct getters on Player, which we will need to address.
            return mapToResponse(player, roster);
        }

        return mapToResponse(player, null);
    }

    @Transactional
    public List<com.leagueos.modules.registration.api.dto.PlayerResponse> registerPlayersBatch(List<com.leagueos.modules.registration.api.dto.BatchPlayerRegistrationRequest> requests, UUID teamId, UUID tenantId) {
        com.leagueos.modules.league.domain.Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found"));
        
        com.leagueos.modules.league.domain.Season activeSeason = seasonRepository.findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("No active season found to batch register players into."));

        com.leagueos.modules.tenant.domain.TenantSettings settings = tenantSettingsService.getCurrentSettings();
        List<com.leagueos.modules.registration.domain.SeasonRoster> existingRosters = seasonRosterRepository.findByTeamIdAndSeasonId(teamId, activeSeason.getId());
        
        List<Player> newPlayers = new java.util.ArrayList<>();
        List<com.leagueos.modules.registration.domain.SeasonRoster> newRosters = new java.util.ArrayList<>();
        
        for (com.leagueos.modules.registration.api.dto.BatchPlayerRegistrationRequest request : requests) {
            if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
                continue; // Skip invalid records
            }
            
            if (settings.isRequireJerseyNumbers()) {
                if (request.getJerseyNumber() == null) {
                     throw new com.leagueos.shared.domain.exception.BusinessRuleException("El número de playera es obligatorio para el jugador " + request.getFirstName() + ".");
                }
                
                // Check within existing or just added players
                boolean duplicateExists = existingRosters.stream()
                        .anyMatch(r -> r.getStatus() == com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE
                                && r.getJerseyNumber() != null
                                && r.getJerseyNumber().equals(request.getJerseyNumber()));
                                
                if (!duplicateExists) {
                    duplicateExists = newRosters.stream()
                        .anyMatch(r -> r.getJerseyNumber() != null
                                && r.getJerseyNumber().equals(request.getJerseyNumber()));
                }
                
                if (duplicateExists) {
                    throw new com.leagueos.shared.domain.exception.BusinessRuleException("El dorsal " + request.getJerseyNumber() + " ya está ocupado. Corrige los duplicados.");
                }
            }
            
            // Format name
            String firstName = request.getFirstName().trim();
            firstName = firstName.substring(0, 1).toUpperCase() + firstName.substring(1).toLowerCase();
            String lastName = request.getLastName() != null ? request.getLastName().trim() : "";
            if (!lastName.isEmpty()) {
                lastName = lastName.substring(0, 1).toUpperCase() + lastName.substring(1).toLowerCase();
            }
            
            com.leagueos.modules.league.domain.Person person = new com.leagueos.modules.league.domain.Person();
            person.setFirstName(firstName);
            person.setLastName(lastName);
            person.setBirthDate(request.getBirthDate());
            person.setTenantId(tenantId);
            person = personRepository.save(person);
    
            Player player = new Player();
            player.setPerson(person);
            player.setTenantId(tenantId);
            player = playerRepository.save(player);
            newPlayers.add(player);

            com.leagueos.modules.registration.domain.SeasonRoster roster = new com.leagueos.modules.registration.domain.SeasonRoster();
            roster.setPlayer(player);
            roster.setTeam(team);
            roster.setSeason(activeSeason);
            roster.setStatus(com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE);
            roster.setJerseyNumber(request.getJerseyNumber());
            roster.setTenantId(tenantId);
            newRosters.add(roster);
        }
        
        seasonRosterRepository.saveAll(newRosters);
        
        List<com.leagueos.modules.registration.api.dto.PlayerResponse> responses = new java.util.ArrayList<>();
        for (int i = 0; i < newPlayers.size(); i++) {
            responses.add(mapToResponse(newPlayers.get(i), newRosters.get(i)));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public List<com.leagueos.modules.registration.api.dto.PlayerResponse> getPlayersByTeam(UUID teamId) {
        // Find players for the current active season by default
        return seasonRepository.findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE)
            .map(season -> seasonRosterRepository.findByTeamIdAndSeasonId(teamId, season.getId()).stream()
                .map(roster -> mapToResponse(roster.getPlayer(), roster))
                .collect(java.util.stream.Collectors.toList()))
            .orElse(java.util.Collections.emptyList());
    }

    private com.leagueos.modules.registration.api.dto.PlayerResponse mapToResponse(Player player, com.leagueos.modules.registration.domain.SeasonRoster roster) {
        com.leagueos.modules.registration.api.dto.PlayerResponse response = new com.leagueos.modules.registration.api.dto.PlayerResponse();
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
