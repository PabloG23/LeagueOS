package com.leagueos.modules.league.service;

import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.competition.persistence.PlayoffTieRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.Tenant;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.league.persistence.TenantRepository;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.hibernate.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeagueService {

    private final TenantRepository tenantRepository;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final MatchRepository matchRepository;
    private final PlayoffTieRepository playoffTieRepository;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<Tenant> getAllTenants() {
        // Tenants are global system data — disable the Hibernate tenant filter
        // so all rows are returned regardless of the active tenant context.
        entityManager.unwrap(Session.class).disableFilter("tenantFilter");
        return tenantRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Team> getAllTeams() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null) {
            return teamRepository.findByTenantIdAndIsActiveTrue(tenantId);
        }
        return teamRepository.findAll().stream().filter(Team::isActive).collect(Collectors.toList());
    }

    @Transactional
    public Team createTeam(Team teamDetails) {
        UUID tenantId = TenantContext.getCurrentTenant();
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
        team.setActive(true);

        if (teamDetails.getRepresentative() != null) {
            team.setRepresentative(teamDetails.getRepresentative());
            team.getRepresentative().setTenantId(tenantId);
        }

        return teamRepository.save(team);
    }

    @Transactional
    public Team updateTeam(UUID teamId, Team teamDetails) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        if (teamDetails.getName() != null && !teamDetails.getName().trim().isEmpty()) {
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
                updateRepresentativeFields(team, teamDetails);
            }
        }

        return teamRepository.save(team);
    }

    @Transactional
    public void softDeleteTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        team.setActive(false);
        teamRepository.save(team);
    }

    @Transactional(readOnly = true)
    public Optional<Tenant> getTenantBySubdomain(String subdomain) {
        return tenantRepository.findBySubdomain(subdomain);
    }

    @Transactional(readOnly = true)
    public List<Season> getAllSeasons() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null) {
            return seasonRepository.findByTenantId(tenantId);
        }
        return seasonRepository.findAll();
    }

    @Transactional
    public Season createSeason(Season season) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // Default max players — configure via TenantSettings when the field is added
        if (tenantId != null && season.getMaxActivePlayersPerTeam() <= 0) {
            season.setMaxActivePlayersPerTeam(26);
        }
        return seasonRepository.save(season);
    }

    @Transactional
    public Season activateSeason(UUID seasonId) {
        Season targetSeason = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        // Deactivate other active seasons in the same division — use saveAll to avoid N+1
        if (targetSeason.getDivision() != null) {
            UUID divisionId = targetSeason.getDivision().getId();
            List<Season> toComplete = seasonRepository.findByStatus(SeasonStatus.ACTIVE).stream()
                    .filter(s -> s.getDivision() != null
                            && s.getDivision().getId().equals(divisionId)
                            && !s.getId().equals(seasonId))
                    .peek(s -> s.setStatus(SeasonStatus.COMPLETED))
                    .collect(Collectors.toList());
            seasonRepository.saveAll(toComplete);
        }

        targetSeason.setStatus(SeasonStatus.ACTIVE);
        return seasonRepository.save(targetSeason);
    }

    @Transactional
    public Season advanceMatchday(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));
        season.setCurrentMatchday(season.getCurrentMatchday() + 1);
        return seasonRepository.save(season);
    }

    @Transactional
    public void deleteDraftSeason(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        if (!SeasonStatus.DRAFT.equals(season.getStatus())) {
            throw new IllegalStateException("Only seasons in DRAFT status can be deleted");
        }

        matchRepository.deleteBySeasonId(seasonId);
        playoffTieRepository.deleteBySeasonId(seasonId);
        teamRegistrationRepository.deleteBySeasonId(seasonId);
        seasonRepository.delete(season);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private void updateRepresentativeFields(Team team, Team teamDetails) {
        var rep = teamDetails.getRepresentative();
        if (rep.getFirstName() != null) team.getRepresentative().setFirstName(rep.getFirstName());
        if (rep.getLastName() != null)  team.getRepresentative().setLastName(rep.getLastName());
        if (rep.getPhone() != null)     team.getRepresentative().setPhone(rep.getPhone());
    }
}
