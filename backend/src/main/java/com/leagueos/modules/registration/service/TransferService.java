package com.leagueos.modules.registration.service;

import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.domain.PlayerStatus;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;

    @Transactional
    public void transferPlayer(UUID playerId, UUID newTeamId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

        Team newTeam = teamRepository.findById(newTeamId)
                .orElseThrow(() -> new RuntimeException("New Team not found"));

        // Update Team
        player.setTeam(newTeam);
        // Reset status to INACTIVE upon transfer
        player.setStatus(PlayerStatus.INACTIVE);

        playerRepository.save(player);
    }
}
