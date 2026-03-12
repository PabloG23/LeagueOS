package com.leagueos.modules.competition.persistence;

import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.api.dto.PlayerStatDTO;
import com.leagueos.modules.competition.api.dto.TeamStatDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchEventRepository extends JpaRepository<MatchEvent, UUID> {
    List<MatchEvent> findByMatchId(UUID matchId);
    void deleteByMatchId(UUID matchId);

    @Query("SELECT COUNT(e) FROM MatchEvent e WHERE e.player.id = :playerId AND e.eventType = :eventType")
    int countEventsByPlayerIdAndEventType(@Param("playerId") UUID playerId, @Param("eventType") com.leagueos.modules.competition.domain.MatchEvent.MatchEventType eventType);

    @Query("SELECT COUNT(DISTINCT e.match.id) FROM MatchEvent e WHERE e.player.id = :playerId AND e.eventType = :eventType")
    int countMatchesByPlayerIdAndEventType(@Param("playerId") UUID playerId, @Param("eventType") com.leagueos.modules.competition.domain.MatchEvent.MatchEventType eventType);

    @Query("SELECT new com.leagueos.modules.competition.api.dto.TeamStatDTO(t.id, t.name, COUNT(e), 0) " +
           "FROM MatchEvent e JOIN e.match m JOIN e.team t " +
           "WHERE e.eventType = 'RED_CARD' AND m.season.id IN :seasonIds " +
           "GROUP BY t.id, t.name " +
           "ORDER BY COUNT(e) DESC")
    List<TeamStatDTO> countRedCardsByTeamForSeason(@Param("seasonIds") List<UUID> seasonIds);

    @Query("SELECT new com.leagueos.modules.competition.api.dto.PlayerStatDTO(p.id, CONCAT(per.firstName, ' ', per.lastName), t.name, t.id, COUNT(e), 0) " +
           "FROM MatchEvent e JOIN e.match m JOIN e.player p JOIN p.person per JOIN e.team t " +
           "WHERE e.eventType = 'RED_CARD' AND m.season.id IN :seasonIds " +
           "GROUP BY p.id, per.firstName, per.lastName, t.name, t.id " +
           "ORDER BY COUNT(e) DESC")
    List<PlayerStatDTO> countRedCardsByPlayerForSeason(@Param("seasonIds") List<UUID> seasonIds);

    @Query("SELECT new com.leagueos.modules.competition.api.dto.PlayerStatDTO(p.id, CONCAT(per.firstName, ' ', per.lastName), t.name, t.id, COUNT(e), 0, MAX(e.notes)) " +
           "FROM MatchEvent e JOIN e.match m JOIN e.player p JOIN p.person per JOIN e.team t " +
           "WHERE e.eventType = 'RED_CARD' AND m.season.id IN :seasonIds AND m.matchday = :matchday " +
           "GROUP BY p.id, per.firstName, per.lastName, t.name, t.id " +
           "ORDER BY COUNT(e) DESC")
    List<PlayerStatDTO> countRedCardsByPlayerForMatchday(@Param("seasonIds") List<UUID> seasonIds, @Param("matchday") Integer matchday);
}
