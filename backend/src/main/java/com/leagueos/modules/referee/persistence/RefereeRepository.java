package com.leagueos.modules.referee.persistence;

import com.leagueos.modules.referee.domain.Referee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefereeRepository extends JpaRepository<Referee, UUID> {

    List<Referee> findAllByOrderByNameAsc();

    List<Referee> findByTenantIdOrderByNameAsc(UUID tenantId);

    Optional<Referee> findByUserId(UUID userId);

    Optional<Referee> findByIdAndTenantId(UUID id, UUID tenantId);
}
