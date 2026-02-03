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

    @Transactional
    public Player registerPlayer(Player player) {
        return playerRepository.save(player);
    }

    @Transactional(readOnly = true)
    public List<Player> getPlayersByTeam(UUID teamId) {
        return playerRepository.findByTeamId(teamId);
    }
}
