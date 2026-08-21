package com.leagueos.modules.league.persistence;

import com.leagueos.modules.league.domain.SoccerField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SoccerFieldRepository extends JpaRepository<SoccerField, UUID> {
    List<SoccerField> findByTenantIdOrderByNameAsc(UUID tenantId);
    Optional<SoccerField> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<SoccerField> findByNameIgnoreCaseAndTenantId(String name, UUID tenantId);
    boolean existsByNameIgnoreCaseAndTenantId(String name, UUID tenantId);
}
