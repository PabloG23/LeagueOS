package com.leagueos.modules.league.persistence;

import com.leagueos.modules.league.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {
    java.util.List<Team> findByTenantId(UUID tenantId);
}
