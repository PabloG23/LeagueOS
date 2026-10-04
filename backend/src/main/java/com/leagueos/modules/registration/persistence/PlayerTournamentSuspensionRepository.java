package com.leagueos.modules.registration.persistence;

import com.leagueos.modules.registration.domain.PlayerTournamentSuspension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerTournamentSuspensionRepository extends JpaRepository<PlayerTournamentSuspension, UUID> {
    List<PlayerTournamentSuspension> findBySeasonId(UUID seasonId);
    List<PlayerTournamentSuspension> findByPlayerIdAndSeasonId(UUID playerId, UUID seasonId);
    
    @Query("SELECT SUM(s.totalMatchesAssigned) FROM PlayerTournamentSuspension s WHERE s.player.id = :playerId AND s.season.id = :seasonId")
    Integer sumTotalMatchesAssignedByPlayerAndSeason(@Param("playerId") UUID playerId, @Param("seasonId") UUID seasonId);

    @Query("SELECT s FROM PlayerTournamentSuspension s WHERE s.player.id = :playerId AND s.season.id = :seasonId AND (s.remainingMatches > 0 OR s.isTournamentBanned = true)")
    List<PlayerTournamentSuspension> findActiveSuspensions(@Param("playerId") UUID playerId, @Param("seasonId") UUID seasonId);
}
