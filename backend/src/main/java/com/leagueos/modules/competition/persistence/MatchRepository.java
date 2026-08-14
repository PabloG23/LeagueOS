package com.leagueos.modules.competition.persistence;

import com.leagueos.modules.competition.api.dto.MatchResultSummaryDTO;
import com.leagueos.modules.competition.domain.Match;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {
    boolean existsBySeasonIdAndTenantId(UUID seasonId, UUID tenantId);
    List<Match> findBySeasonId(UUID seasonId);
    List<Match> findBySeasonIdAndStatusIn(UUID seasonId, List<com.leagueos.modules.competition.domain.Match.MatchStatus> statuses);
    List<Match> findByMatchday(Integer matchday);
    List<Match> findByMatchDateBetween(LocalDateTime start, LocalDateTime end);
    List<Match> findBySeasonIdAndStage(UUID seasonId, com.leagueos.modules.competition.domain.MatchStage stage);
    List<Match> findByPlayoffTieId(UUID playoffTieId);
    void deleteBySeasonIdAndStage(UUID seasonId, com.leagueos.modules.competition.domain.MatchStage stage);
    void deleteBySeasonId(UUID seasonId);

    @Query("SELECT new com.leagueos.modules.competition.api.dto.MatchResultSummaryDTO(" +
           "m.homeTeam.id, m.homeTeam.name, m.awayTeam.id, m.awayTeam.name, m.homeScore, m.awayScore, m.matchDate, m.isDoubleForfeit) " +
           "FROM Match m " +
           "WHERE m.season.id = :seasonId AND m.status = 'FINISHED' " +
           "ORDER BY m.matchDate ASC")
    List<MatchResultSummaryDTO> findFinishedMatchSummariesBySeasonId(@Param("seasonId") UUID seasonId);
}

