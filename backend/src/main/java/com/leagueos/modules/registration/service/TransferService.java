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
    private final com.leagueos.modules.registration.persistence.SeasonRosterRepository seasonRosterRepository;
    private final com.leagueos.modules.league.persistence.SeasonRepository seasonRepository;

    @Transactional
    public void transferPlayer(UUID playerId, UUID newTeamId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));

        Team newTeam = teamRepository.findById(newTeamId)
                .orElseThrow(() -> new RuntimeException("New Team not found"));

        com.leagueos.modules.league.domain.Season activeSeason = seasonRepository.findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("No active season found for transfer"));

        com.leagueos.modules.registration.domain.SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new RuntimeException("Player does not have an active roster in the current season"));

        // Transfer to new Team
        roster.setTeam(newTeam);
        // Reset status to INACTIVE upon transfer (requires reactivation)
        roster.setStatus(PlayerStatus.INACTIVE);

        seasonRosterRepository.save(roster);
    }
}
