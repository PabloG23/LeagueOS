package com.leagueos.modules.league.persistence;

import com.leagueos.modules.league.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SeasonRepository extends JpaRepository<Season, UUID> {
    List<Season> findByStatus(com.leagueos.modules.league.domain.SeasonStatus status);

    java.util.Optional<Season> findFirstByStatus(com.leagueos.modules.league.domain.SeasonStatus status);

    java.util.Optional<Season> findByIdAndTenantId(UUID id, UUID tenantId);
}
