package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final MatchEventRepository matchEventRepository;
    private final PlayerRepository playerRepository;
    private final TenantSettingsService tenantSettingsService;

    @Transactional
    public void submitMatchReport(UUID matchId, List<MatchEvent> events) {
        // 1. Validate Match
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

        // 2. Clear existing events (if re-submitting) or just append? 
        // Assuming append or fresh submission. For simplicity, we save all.
        // In a real app, we might check for duplicates or clear previous reports.
        
        // 3. Process Events
        int homeGoals = 0;
        int awayGoals = 0;
        TenantSettings settings = tenantSettingsService.getCurrentSettings();

        for (MatchEvent event : events) {
            event.setMatch(match); // Link event to match
            matchEventRepository.save(event);

            // Auto-Score
            if (event.getEventType() == MatchEvent.MatchEventType.GOAL) {
                if (match.getHomeTeam().getId().equals(event.getTeam().getId())) {
                    homeGoals++;
                } else if (match.getAwayTeam().getId().equals(event.getTeam().getId())) {
                    awayGoals++;
                }
            }

            // Feature-Flagged Auto-Suspension
            if (settings.isEnableAutoSuspensions() && event.getEventType() == MatchEvent.MatchEventType.RED_CARD) {
                if (event.getPlayer() != null) {
                    Player player = playerRepository.findById(event.getPlayer().getId())
                            .orElseThrow(() -> new ResourceNotFoundException("Player not found"));
                    
                    int suspensionDuration = event.getSuspensionMatchdays() != null ? event.getSuspensionMatchdays() : 1;
                    int currentMatchday = match.getMatchday() != null ? match.getMatchday() : 0;
                    
                    player.setSuspendedUntilMatchday(currentMatchday + suspensionDuration);
                    playerRepository.save(player);
                }
            }
        }

        // 4. Update Match Score and Status
        match.setHomeScore(homeGoals);
        match.setAwayScore(awayGoals);
        match.setStatus(Match.MatchStatus.FINISHED);
        matchRepository.save(match);
    }
    
    public List<Match> getMatchesByMatchday(Integer matchday) {
        return matchRepository.findByMatchday(matchday);
    }
}
