package com.leagueos.modules.registration.persistence;

import com.leagueos.modules.registration.domain.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlayerRepository extends JpaRepository<Player, UUID> {
    List<Player> findByTeamId(UUID teamId);
}
