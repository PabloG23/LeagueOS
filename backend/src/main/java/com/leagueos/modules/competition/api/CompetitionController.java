package com.leagueos.modules.competition.api;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.service.MatchSchedulerService;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/competition")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CompetitionController {

    private final MatchSchedulerService schedulerService;

    @PostMapping("/matches")
    public Match scheduleMatch(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody Match match) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            match.setTenantId(tenantId);
            return schedulerService.scheduleMatch(match);
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/seasons/{seasonId}/matches")
    public List<Match> getSeasonMatches(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID seasonId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return schedulerService.getMatchesBySeason(seasonId);
        } finally {
            TenantContext.clear();
        }
    }

    @PatchMapping("/matches/{matchId}/result")
    public Match recordResult(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID matchId,
            @RequestParam int homeScore,
            @RequestParam int awayScore) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return schedulerService.recordResult(matchId, homeScore, awayScore);
        } finally {
            TenantContext.clear();
        }
    }
}
