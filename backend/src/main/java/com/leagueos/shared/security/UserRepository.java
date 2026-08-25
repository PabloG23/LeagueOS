package com.leagueos.shared.security;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    List<User> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<User> findByTenantIdAndRole(String tenantId, Role role);
    Optional<User> findByTeamId(UUID teamId);
    Optional<User> findByPersonId(UUID personId);
    boolean existsByUsername(String username);
}
