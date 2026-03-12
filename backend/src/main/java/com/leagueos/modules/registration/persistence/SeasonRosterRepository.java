package com.leagueos.modules.registration.persistence;

import com.leagueos.modules.registration.domain.SeasonRoster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeasonRosterRepository extends JpaRepository<SeasonRoster, UUID> {
    List<SeasonRoster> findByTeamIdAndSeasonId(UUID teamId, UUID seasonId);
    List<SeasonRoster> findByPlayerId(UUID playerId);
    Optional<SeasonRoster> findByPlayerIdAndSeasonId(UUID playerId, UUID seasonId);
    void deleteByPlayerIdAndTeamIdAndSeasonId(UUID playerId, UUID teamId, UUID seasonId);
    int countByTeamIdAndSeasonIdAndStatus(UUID teamId, UUID seasonId, com.leagueos.modules.registration.domain.PlayerStatus status);
}
