package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.UpdateMatchScheduleRequest;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final MatchEventRepository matchEventRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final TenantSettingsService tenantSettingsService;
    private final PlayoffService playoffService;

    @Transactional
    public void submitMatchReport(UUID matchId, List<MatchEvent> events) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

        matchEventRepository.deleteByMatchId(matchId);
        matchEventRepository.flush();

        int homeGoals = 0;
        int awayGoals = 0;
        boolean isDoubleForfeit = false;
        TenantSettings settings = tenantSettingsService.getCurrentSettings();

        List<MatchEvent> eventsToSave = new ArrayList<>();

        if (events != null) {
            for (MatchEvent eventRaw : events) {
                if (eventRaw.getEventType() == MatchEvent.MatchEventType.DOUBLE_FORFEIT) {
                    isDoubleForfeit = true;
                    continue;
                }

                MatchEvent event = buildMatchEvent(eventRaw, match);
                eventsToSave.add(event);

                if (event.getEventType() == MatchEvent.MatchEventType.GOAL && event.getTeam() != null) {
                    if (match.getHomeTeam() != null && match.getHomeTeam().getId().equals(event.getTeam().getId())) {
                        homeGoals++;
                    } else if (match.getAwayTeam() != null && match.getAwayTeam().getId().equals(event.getTeam().getId())) {
                        awayGoals++;
                    }
                }

                if (settings != null && settings.isEnableAutoSuspensions() && event.getEventType() == MatchEvent.MatchEventType.RED_CARD) {
                    applyAutoSuspension(event, match);
                }
            }
        }

        if (!eventsToSave.isEmpty()) {
            matchEventRepository.saveAll(eventsToSave);
        }

        match.setHomeScore(homeGoals);
        match.setAwayScore(awayGoals);
        match.setStatus(Match.MatchStatus.FINISHED);
        match.setIsDoubleForfeit(isDoubleForfeit);
        matchRepository.save(match);

        if (MatchStage.PLAYOFFS.equals(match.getStage()) && match.getPlayoffTie() != null) {
            playoffService.resolveTie(match.getPlayoffTie().getId());
        }
    }

    public List<Match> getMatchesByMatchday(Integer matchday) {
        return matchRepository.findByMatchday(matchday);
    }

    public List<MatchEvent> getMatchEvents(UUID matchId) {
        return matchEventRepository.findByMatchId(matchId);
    }

    @Transactional
    public Match updateMatchSchedule(UUID matchId, UpdateMatchScheduleRequest request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

        if (!match.getTenantId().equals(TenantContext.getCurrentTenant())) {
            throw new IllegalStateException("Match does not belong to the current tenant");
        }

        match.setMatchDate(request.getMatchDate());
        match.setLocation(request.getLocation());

        return matchRepository.save(match);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /** Factory method that creates a persisted MatchEvent from a raw incoming event. */
    private MatchEvent buildMatchEvent(MatchEvent raw, Match match) {
        MatchEvent event = new MatchEvent();
        event.setMatch(match);
        event.setTenantId(match.getTenantId());

        if (raw.getPlayer() != null && raw.getPlayer().getId() != null) {
            Player player = playerRepository.findById(raw.getPlayer().getId()).orElse(null);
            event.setPlayer(player);
        } else {
            event.setPlayer(null);
        }

        if (raw.getTeam() != null && raw.getTeam().getId() != null) {
            Team team = teamRepository.findById(raw.getTeam().getId()).orElse(null);
            event.setTeam(team != null ? team : match.getHomeTeam());
        } else {
            event.setTeam(match.getHomeTeam());
        }

        event.setEventType(raw.getEventType());
        event.setSuspensionMatchdays(raw.getSuspensionMatchdays());
        event.setNotes(raw.getNotes());
        return event;
    }

    private void applyAutoSuspension(MatchEvent event, Match match) {
        if (event.getPlayer() == null) return;
        Player player = playerRepository.findById(event.getPlayer().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Player not found: " + event.getPlayer().getId()));
        int suspensionDuration = event.getSuspensionMatchdays() != null ? event.getSuspensionMatchdays() : 1;
        int currentMatchday = match.getMatchday() != null ? match.getMatchday() : 0;
        player.setSuspendedUntilMatchday(currentMatchday + suspensionDuration);
        playerRepository.save(player);
    }
}
