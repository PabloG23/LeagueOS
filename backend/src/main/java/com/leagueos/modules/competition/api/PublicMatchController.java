package com.leagueos.modules.competition.api;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/matches")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // For development
public class PublicMatchController {

    private final SeasonRepository seasonRepository;
    private final MatchRepository matchRepository;

    @GetMapping("/upcoming")
    public ResponseEntity<List<Match>> getUpcomingMatches(
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        
        TenantContext.setCurrentTenant(tenantId);
        try {
            // Find all active seasons for this tenant
            List<Season> activeSeasons = seasonRepository.findByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
            
            List<Match> upcomingMatches = new ArrayList<>();
            // For each active season, fetch matches for its current matchday
            for (Season season : activeSeasons) {
                List<Match> matches = matchRepository.findByMatchday(season.getCurrentMatchday());
                for (Match m : matches) {
                    if (m.getSeason().getId().equals(season.getId()) && m.getStatus() == Match.MatchStatus.SCHEDULED) {
                        upcomingMatches.add(m);
                    }
                }
            }

            // Sort by match date just in case
            upcomingMatches.sort((m1, m2) -> {
                if (m1.getMatchDate() == null || m2.getMatchDate() == null) return 0;
                return m1.getMatchDate().compareTo(m2.getMatchDate());
            });

            return ResponseEntity.ok(upcomingMatches);
        } finally {
            TenantContext.clear();
        }
    }
}
