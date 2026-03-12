package com.leagueos.modules.league.service;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.Tenant;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.league.persistence.TenantRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.competition.persistence.PlayoffTieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeagueService {

    private final TenantRepository tenantRepository;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final MatchRepository matchRepository;
    private final PlayoffTieRepository playoffTieRepository;

    @Transactional(readOnly = true)
    public List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Team> getAllTeams() {
        UUID tenantId = com.leagueos.shared.context.TenantContext.getCurrentTenant();
        if (tenantId != null) {
            return teamRepository.findByTenantIdAndIsActiveTrue(tenantId);
        }
        return teamRepository.findAll().stream().filter(Team::isActive).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public Team createTeam(Team teamDetails) {
        UUID tenantId = com.leagueos.shared.context.TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not available.");
        }

        if (teamRepository.existsByNameIgnoreCaseAndTenantId(teamDetails.getName(), tenantId)) {
            throw new IllegalArgumentException("Ya existe un equipo activo con ese nombre en esta liga.");
        }

        Team team = new Team();
        team.setTenantId(tenantId);
        team.setName(teamDetails.getName());
        team.setLogoUrl(teamDetails.getLogoUrl());
        team.setActive(true); // Teams are active by default when created

        // Handle representative if provided
        if (teamDetails.getRepresentative() != null) {
            team.setRepresentative(teamDetails.getRepresentative());
            team.getRepresentative().setTenantId(tenantId);
        }

        return teamRepository.save(team);
    }

    @Transactional
    public Team updateTeam(UUID teamId, Team teamDetails) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found"));
        
        if (teamDetails.getName() != null && !teamDetails.getName().trim().isEmpty()) {
            // Check for uniqueness if the name is being changed
            if (!team.getName().equalsIgnoreCase(teamDetails.getName()) &&
                teamRepository.existsByNameIgnoreCaseAndTenantId(teamDetails.getName(), team.getTenantId())) {
                throw new IllegalArgumentException("Ya existe otro equipo activo con ese nombre en esta liga.");
            }
            team.setName(teamDetails.getName());
        }
        if (teamDetails.getLogoUrl() != null) {
            team.setLogoUrl(teamDetails.getLogoUrl());
        }
        
        if (teamDetails.getRepresentative() != null) {
            if (team.getRepresentative() == null) {
                team.setRepresentative(teamDetails.getRepresentative());
                team.getRepresentative().setTenantId(team.getTenantId());
            } else {
                if (teamDetails.getRepresentative().getFirstName() != null) {
                    team.getRepresentative().setFirstName(teamDetails.getRepresentative().getFirstName());
                }
                if (teamDetails.getRepresentative().getLastName() != null) {
                    team.getRepresentative().setLastName(teamDetails.getRepresentative().getLastName());
                }
                if (teamDetails.getRepresentative().getPhone() != null) {
                    team.getRepresentative().setPhone(teamDetails.getRepresentative().getPhone());
                }
            }
        }
        
        return teamRepository.save(team);
    }

    @Transactional
    public void softDeleteTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found"));
        
        team.setActive(false);
        teamRepository.save(team);
    }

    @Transactional(readOnly = true)
    public Optional<Tenant> getTenantBySubdomain(String subdomain) {
        return tenantRepository.findBySubdomain(subdomain);
    }

    @Transactional(readOnly = true)
    public List<Season> getAllSeasons() {
        UUID tenantId = com.leagueos.shared.context.TenantContext.getCurrentTenant();
        if (tenantId != null) {
            return seasonRepository.findByTenantId(tenantId);
        }
        return seasonRepository.findAll();
    }

    @Transactional
    public Season createSeason(Season season) {
        UUID tenantId = com.leagueos.shared.context.TenantContext.getCurrentTenant();
        if (tenantId != null) {
            if ("22222222-2222-2222-2222-222222222222".equals(tenantId.toString())) {
                season.setMaxActivePlayersPerTeam(25);
            } else {
                season.setMaxActivePlayersPerTeam(26);
            }
        }
        return seasonRepository.save(season);
    }

    @Transactional
    public Season activateSeason(UUID seasonId) {
        Season targetSeason = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Season not found"));
        
        // Deactivate all other seasons in the same division
        if (targetSeason.getDivision() != null) {
            List<Season> activeSeasons = seasonRepository.findByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
            for (Season s : activeSeasons) {
                if (s.getDivision() != null && s.getDivision().getId().equals(targetSeason.getDivision().getId()) 
                    && !s.getId().equals(seasonId)) {
                    s.setStatus(com.leagueos.modules.league.domain.SeasonStatus.COMPLETED); // or DRAFT/etc depending on business rule
                    seasonRepository.save(s);
                }
            }
        }

        targetSeason.setStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
        return seasonRepository.save(targetSeason);
    }

    @Transactional
    public Season advanceMatchday(UUID seasonId) {
        Season targetSeason = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Season not found"));
        
        targetSeason.setCurrentMatchday(targetSeason.getCurrentMatchday() + 1);
        return seasonRepository.save(targetSeason);
    }

    @Transactional
    public void deleteDraftSeason(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Season not found"));
        
        if (!com.leagueos.modules.league.domain.SeasonStatus.DRAFT.equals(season.getStatus())) {
            throw new IllegalStateException("Only seasons in DRAFT status can be deleted");
        }
        
        // Clean up foreign keys before deleting
        matchRepository.deleteBySeasonId(seasonId);
        playoffTieRepository.deleteBySeasonId(seasonId);
        teamRegistrationRepository.deleteBySeasonId(seasonId);
        
        seasonRepository.delete(season);
    }
}
