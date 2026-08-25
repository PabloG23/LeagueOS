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
public class CompetitionController {

    private final MatchSchedulerService schedulerService;
    private final com.leagueos.modules.media.service.StorageService storageService;

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
            List<Match> matches = schedulerService.getMatchesBySeason(seasonId);
            signMatchTeamLogos(matches);
            return matches;
        } finally {
            TenantContext.clear();
        }
    }

    private void signMatchTeamLogos(List<Match> matches) {
        if (matches == null || storageService == null) return;
        for (Match m : matches) {
            if (m.getHomeTeam() != null && m.getHomeTeam().getLogoUrl() != null && !m.getHomeTeam().getLogoUrl().isBlank()) {
                String logo = m.getHomeTeam().getLogoUrl();
                try {
                    m.getHomeTeam().setSignedLogoUrl(logo.startsWith("http") ? logo : storageService.getSignedUrl(logo, 120));
                } catch (Exception ignored) {
                    m.getHomeTeam().setSignedLogoUrl(logo);
                }
            }
            if (m.getAwayTeam() != null && m.getAwayTeam().getLogoUrl() != null && !m.getAwayTeam().getLogoUrl().isBlank()) {
                String logo = m.getAwayTeam().getLogoUrl();
                try {
                    m.getAwayTeam().setSignedLogoUrl(logo.startsWith("http") ? logo : storageService.getSignedUrl(logo, 120));
                } catch (Exception ignored) {
                    m.getAwayTeam().setSignedLogoUrl(logo);
                }
            }
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
