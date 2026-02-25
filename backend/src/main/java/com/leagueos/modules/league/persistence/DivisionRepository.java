package com.leagueos.modules.league.persistence;

import com.leagueos.modules.league.domain.Division;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DivisionRepository extends JpaRepository<Division, UUID> {
}
