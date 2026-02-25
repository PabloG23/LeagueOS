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

    @Transactional
    public void activatePlayer(UUID playerId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

        if (player.getTeam() == null) {
            throw new RuntimeException("Player must be assigned to a team to be activated");
        }

        com.leagueos.modules.league.domain.Season activeSeason = seasonRepository.findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("No active season found"));

        int currentActivePlayers = playerRepository.countByTeamIdAndStatus(
                player.getTeam().getId(), 
                com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE
        );

        if (currentActivePlayers >= activeSeason.getMaxActivePlayersPerTeam()) {
            throw new com.leagueos.shared.domain.exception.BusinessRuleException(
                    "Team has reached the maximum number of active players (" + activeSeason.getMaxActivePlayersPerTeam() + ")"
            );
        }

        player.setStatus(com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE);
        playerRepository.save(player);
    }

    @Transactional
    public void deactivatePlayer(UUID playerId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

        player.setStatus(com.leagueos.modules.registration.domain.PlayerStatus.INACTIVE);
        playerRepository.save(player);
    }

    @Transactional
    public Player registerPlayer(com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest request, UUID defaultTeamId, UUID tenantId) {
        UUID teamId = request.getTeamId() != null ? request.getTeamId() : defaultTeamId;
        com.leagueos.modules.league.domain.Team team = null;
        if (teamId != null) {
            team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found"));
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
        player.setTeam(team);
        player.setStatus(com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE);
        player.setTenantId(tenantId);

        return playerRepository.save(player);
    }

    @Transactional(readOnly = true)
    public List<Player> getPlayersByTeam(UUID teamId) {
        return playerRepository.findByTeamId(teamId);
    }
}
