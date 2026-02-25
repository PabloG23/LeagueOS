package com.leagueos.modules.league.persistence;

import com.leagueos.modules.league.domain.TeamRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TeamRegistrationRepository extends JpaRepository<TeamRegistration, UUID> {
    List<TeamRegistration> findBySeasonId(UUID seasonId);
    List<TeamRegistration> findByStatus(TeamRegistration.RegistrationStatus status);
}
