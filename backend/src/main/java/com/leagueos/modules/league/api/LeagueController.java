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
            return leagueService.createTeam(team);
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
}
