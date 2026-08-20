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
import com.leagueos.modules.media.service.StorageService;
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
    private final com.leagueos.modules.media.service.StorageService storageService;
    private final com.leagueos.modules.registration.persistence.SeasonRosterRepository seasonRosterRepository;

    @Transactional
    public Team uploadTeamLogo(UUID teamId, byte[] imageBytes, String contentType, UUID tenantId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        if (!team.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Unauthorized tenant access.");
        }

        String extension = contentType != null && contentType.contains("png") ? ".png" : (contentType != null && contentType.contains("svg") ? ".svg" : ".webp");
        String teamSlug = StorageService.toSlug(team.getName());
        String shortId = UUID.randomUUID().toString().substring(0, 8);
        String filename = storageService.buildTenantKey(tenantId, "teams", teamSlug + "_" + shortId + extension);

        String oldLogo = team.getLogoUrl();
        if (oldLogo != null && (oldLogo.contains("/teams/") || oldLogo.startsWith("tenants/"))) {
            storageService.deleteFile(oldLogo);
        }

        storageService.uploadFile(filename, imageBytes, contentType != null ? contentType : "image/jpeg");
        team.setLogoUrl(filename);
        Team saved = teamRepository.save(team);
        saved.setSignedLogoUrl(storageService.getSignedUrl(filename, 120));
        return saved;
    }

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
        List<Team> teams = tenantId != null
                ? teamRepository.findByTenantIdOrderByNameAsc(tenantId)
                : teamRepository.findAllByOrderByNameAsc();

        Optional<Season> activeSeason = tenantId != null
                ? seasonRepository.findByTenantIdAndStatus(tenantId, SeasonStatus.ACTIVE).stream().findFirst()
                : seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE);

        List<Object[]> counts = activeSeason.isPresent()
                ? seasonRosterRepository.countActivePlayersBySeason(activeSeason.get().getId(), com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE)
                : seasonRosterRepository.countActivePlayersAll(com.leagueos.modules.registration.domain.PlayerStatus.ACTIVE);
        java.util.Map<UUID, Integer> countMap = new java.util.HashMap<>();
        for (Object[] row : counts) {
            UUID tId = (UUID) row[0];
            Number num = (Number) row[1];
            countMap.put(tId, num != null ? num.intValue() : 0);
        }

        for (Team team : teams) {
            team.setActivePlayersCount(countMap.getOrDefault(team.getId(), 0));
            if (team.getLogoUrl() != null && !team.getLogoUrl().startsWith("http")) {
                team.setSignedLogoUrl(storageService.getSignedUrl(team.getLogoUrl(), 120));
            } else {
                team.setSignedLogoUrl(team.getLogoUrl());
            }
        }

        return teams;
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

        Team saved = teamRepository.save(team);
        if (saved.getLogoUrl() != null && !saved.getLogoUrl().startsWith("http")) {
            saved.setSignedLogoUrl(storageService.getSignedUrl(saved.getLogoUrl(), 120));
        } else {
            saved.setSignedLogoUrl(saved.getLogoUrl());
        }
        return saved;
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

        Team saved = teamRepository.save(team);
        if (saved.getLogoUrl() != null && !saved.getLogoUrl().startsWith("http")) {
            saved.setSignedLogoUrl(storageService.getSignedUrl(saved.getLogoUrl(), 120));
        } else {
            saved.setSignedLogoUrl(saved.getLogoUrl());
        }
        return saved;
    }

    @Transactional
    public void softDeleteTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        team.setActive(false);
        teamRepository.save(team);
    }

    @Transactional
    public void activateTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        team.setActive(true);
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
            season.setMaxActivePlayersPerTeam(30);
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
    public Season updateCurrentMatchday(UUID seasonId, int matchday) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));
        season.setCurrentMatchday(matchday);
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
