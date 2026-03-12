package com.leagueos.modules.league.api;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.Tenant;
import com.leagueos.modules.league.service.LeagueService;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/leagues")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // For development
public class LeagueController {

    private final LeagueService leagueService;
    private final com.leagueos.modules.competition.service.FixtureGeneratorService fixtureGeneratorService;
    private final com.leagueos.modules.competition.service.MatchImportService matchImportService;
    private final com.leagueos.modules.league.service.TeamRegistrationService teamRegistrationService;
    private final com.leagueos.modules.competition.service.PlayoffService playoffService;
    private final com.leagueos.modules.competition.persistence.PlayoffTieRepository playoffTieRepository;

    @GetMapping("/tenants")
    public List<Tenant> getTenants() {
        return leagueService.getAllTenants();
    }

    @GetMapping("/teams")
    public List<Team> getTeams(@RequestHeader(value = "X-Tenant-ID") UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return leagueService.getAllTeams();
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/teams")
    public Team createTeam(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody Team team) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            team.setTenantId(tenantId);
            if (team.getRepresentative() != null) {
                team.getRepresentative().setTenantId(tenantId);
            }
            return leagueService.createTeam(team);
        } finally {
            TenantContext.clear();
        }
    }

    @DeleteMapping("/teams/{teamId}")
    public void deleteTeam(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID teamId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            leagueService.softDeleteTeam(teamId);
        } finally {
            TenantContext.clear();
        }
    }

    @PutMapping("/teams/{teamId}")
    public Team updateTeam(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID teamId,
            @RequestBody Team team) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return leagueService.updateTeam(teamId, team);
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/seasons")
    public List<Season> getSeasons(@RequestHeader(value = "X-Tenant-ID", required = false) UUID tenantId) {
        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }
        try {
            return leagueService.getAllSeasons();
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/seasons")
    public ResponseEntity<Season> createSeason(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody Season season) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            season.setTenantId(tenantId);
            return ResponseEntity.ok(leagueService.createSeason(season));
        } finally {
            TenantContext.clear();
        }
    }

    @PutMapping("/seasons/{id}/activate")
    public ResponseEntity<Season> activateSeason(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(leagueService.activateSeason(id));
        } finally {
            TenantContext.clear();
        }
    }

    @PutMapping("/seasons/{id}/advance-matchday")
    public ResponseEntity<Season> advanceMatchday(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(leagueService.advanceMatchday(id));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/seasons/{id}/generate-fixtures/round-robin")
    public ResponseEntity<?> generateRoundRobinFixtures(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(fixtureGeneratorService.generateRoundRobinMatches(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/seasons/{id}/import-calendar")
    public ResponseEntity<?> importCalendar(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable String id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(matchImportService.importMatchesFromExcel(id, file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/seasons/{id}/enroll")
    public ResponseEntity<List<com.leagueos.modules.league.domain.TeamRegistration>> enrollTeams(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody List<UUID> teamIds) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(teamRegistrationService.enrollTeamsToSeason(id, teamIds, tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/seasons/{id}/teams")
    public ResponseEntity<List<com.leagueos.modules.league.domain.TeamRegistration>> getEnrolledTeams(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(teamRegistrationService.getEnrolledTeams(id));
        } finally {
            TenantContext.clear();
        }
    }

    @DeleteMapping("/seasons/{id}/teams/{teamId}")
    public ResponseEntity<Void> unenrollTeam(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @PathVariable UUID teamId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            teamRegistrationService.unenrollTeam(id, teamId);
            return ResponseEntity.ok().build();
        } finally {
            TenantContext.clear();
        }
    }

    @DeleteMapping("/seasons/{id}")
    public ResponseEntity<Void> deleteSeason(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            leagueService.deleteDraftSeason(id);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        } finally {
            TenantContext.clear();
        }
    }

    public static class GeneratePlayoffRequest {
        public com.leagueos.modules.competition.domain.PlayoffRound startingRound;
        public List<UUID> seededTeamIds;
        public int numLegs;
    }

    @PostMapping("/seasons/{id}/playoffs/generate")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN_' + #tenantId.toString().replace('-', '_').toUpperCase())")
    public ResponseEntity<?> generatePlayoffs(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id,
            @RequestBody GeneratePlayoffRequest request) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            playoffService.generateBracket(id, request.startingRound, request.seededTeamIds, request.numLegs);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/seasons/{id}/playoffs/bracket")
    public ResponseEntity<?> getPlayoffBracket(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(playoffTieRepository.findBySeasonId(id));
        } finally {
            TenantContext.clear();
        }
    }

    @DeleteMapping("/seasons/{id}/playoffs")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN_' + #tenantId.toString().replace('-', '_').toUpperCase())")
    public ResponseEntity<?> deletePlayoffs(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID id) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            playoffService.deleteBracket(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } finally {
            TenantContext.clear();
        }
    }
}
