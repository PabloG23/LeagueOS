package com.leagueos.modules.competition.api;

import com.leagueos.modules.competition.api.dto.PlayerStatDTO;
import com.leagueos.modules.competition.api.dto.PlayerProfileStatsDTO;
import com.leagueos.modules.competition.api.dto.TeamStatDTO;
import com.leagueos.modules.competition.api.dto.TeamStandingDTO;
import com.leagueos.modules.competition.service.StatsService;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/stats")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // For development
public class PublicStatsController {

    private final StatsService statsService;
    private final SeasonRepository seasonRepository;

    @GetMapping("/discipline/general")
    public ResponseEntity<List<PlayerStatDTO>> getGeneralDisciplineStats(
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            List<Season> activeSeasons = getActiveSeasons(tenantId);
            if (activeSeasons.isEmpty()) return ResponseEntity.ok(List.of());

            List<UUID> seasonIds = activeSeasons.stream().map(Season::getId).collect(Collectors.toList());
            return ResponseEntity.ok(statsService.getTopRedCardsByPlayerForSeason(seasonIds));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/discipline/matchday")
    public ResponseEntity<List<PlayerStatDTO>> getMatchdayDisciplineStats(
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            List<Season> activeSeasons = getActiveSeasons(tenantId);
            if (activeSeasons.isEmpty()) return ResponseEntity.ok(List.of());

            List<UUID> seasonIds = activeSeasons.stream().map(Season::getId).collect(Collectors.toList());
            Integer maxMatchday = activeSeasons.stream()
                .map(Season::getCurrentMatchday)
                .filter(m -> m != null)
                .max(Integer::compareTo)
                .orElse(1);

            return ResponseEntity.ok(statsService.getTopRedCardsByPlayerForMatchday(seasonIds, maxMatchday));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/discipline/teams")
    public ResponseEntity<List<TeamStatDTO>> getTeamDisciplineStats(
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            List<Season> activeSeasons = getActiveSeasons(tenantId);
            if (activeSeasons.isEmpty()) return ResponseEntity.ok(List.of());

            List<UUID> seasonIds = activeSeasons.stream().map(Season::getId).collect(Collectors.toList());
            return ResponseEntity.ok(statsService.getTopRedCardsByTeamForSeason(seasonIds));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/seasons/{seasonId}/standings")
    public ResponseEntity<List<TeamStandingDTO>> getStandings(
            @PathVariable UUID seasonId,
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(statsService.calculateStandings(seasonId));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/players/{playerId}")
    public ResponseEntity<PlayerProfileStatsDTO> getPlayerStats(
            @PathVariable UUID playerId,
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(statsService.getPlayerProfileStats(playerId));
        } finally {
            TenantContext.clear();
        }
    }

    private List<Season> getActiveSeasons(UUID tenantId) {
        return seasonRepository.findByTenantIdAndStatus(tenantId, com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
    }
}
