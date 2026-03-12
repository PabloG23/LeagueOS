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
            List<Season> activeSeasons = seasonRepository.findByTenantIdAndStatus(tenantId, com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
            
            List<Match> upcomingMatches = new ArrayList<>();
            // For each active season, fetch all matches for its current matchday
            System.out.println("Active seasons found: " + activeSeasons.size());
            for (Season season : activeSeasons) {
                System.out.println("Checking season: " + season.getName() + " with currentMatchday: " + season.getCurrentMatchday());
                List<Match> matches = matchRepository.findByMatchday(season.getCurrentMatchday());
                System.out.println("Matches found for matchday " + season.getCurrentMatchday() + ": " + matches.size());
                for (Match m : matches) {
                    if (m.getSeason().getId().equals(season.getId())) {
                        upcomingMatches.add(m);
                    }
                }
            }
            System.out.println("Total upcoming matches to return: " + upcomingMatches.size());

            // Sort by match date
            upcomingMatches.sort((m1, m2) -> {
                if (m1.getMatchDate() == null || m2.getMatchDate() == null) return 0;
                return m1.getMatchDate().compareTo(m2.getMatchDate());
            });

            return ResponseEntity.ok(upcomingMatches);
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/season")
    public ResponseEntity<List<Match>> getAllMatchesForSeason(
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        
        TenantContext.setCurrentTenant(tenantId);
        try {
            List<Season> activeSeasons = seasonRepository.findByTenantIdAndStatus(tenantId, com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
            
            List<Match> allSeasonMatches = new ArrayList<>();
            for (Season season : activeSeasons) {
                // Fetch matches by season. To avoid writing a new repository query for this specific
                // prompt optimization, we can just fetch all and filter, or use an existing method if available.
                List<Match> matches = matchRepository.findAll();
                for (Match m : matches) {
                    if (m.getSeason().getId().equals(season.getId())) {
                        allSeasonMatches.add(m);
                    }
                }
            }

            // Sort by matchday first, then by match date
            allSeasonMatches.sort((m1, m2) -> {
                int matchdayCompare = m1.getMatchday().compareTo(m2.getMatchday());
                if (matchdayCompare != 0) return matchdayCompare;
                
                if (m1.getMatchDate() == null || m2.getMatchDate() == null) return 0;
                return m1.getMatchDate().compareTo(m2.getMatchDate());
            });

            return ResponseEntity.ok(allSeasonMatches);
        } finally {
            TenantContext.clear();
        }
    }
}
