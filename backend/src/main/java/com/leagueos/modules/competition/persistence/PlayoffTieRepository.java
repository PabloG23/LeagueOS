package com.leagueos.modules.competition.persistence;

import com.leagueos.modules.competition.domain.PlayoffTie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlayoffTieRepository extends JpaRepository<PlayoffTie, UUID> {
    List<PlayoffTie> findBySeasonId(UUID seasonId);
    void deleteBySeasonId(UUID seasonId);
}
