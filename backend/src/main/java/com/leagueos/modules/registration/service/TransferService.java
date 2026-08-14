package com.leagueos.modules.registration.service;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.domain.PlayerStatus;
import com.leagueos.modules.registration.domain.SeasonRoster;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import com.leagueos.modules.registration.persistence.SeasonRosterRepository;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final SeasonRosterRepository seasonRosterRepository;
    private final SeasonRepository seasonRepository;

    @Transactional
    public void transferPlayer(UUID playerId, UUID newTeamId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player not found: " + playerId));

        Team newTeam = teamRepository.findById(newTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + newTeamId));

        Season activeSeason = seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active season found for transfer"));

        SeasonRoster roster = seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Player does not have an active roster in the current season"));

        roster.setTeam(newTeam);
        // Reset to INACTIVE upon transfer — requires reactivation by the new team admin
        roster.setStatus(PlayerStatus.INACTIVE);

        seasonRosterRepository.save(roster);
    }
}
