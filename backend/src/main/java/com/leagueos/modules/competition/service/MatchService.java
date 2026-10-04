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
    private final com.leagueos.modules.registration.persistence.PlayerTournamentSuspensionRepository playerTournamentSuspensionRepository;

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

                if (event.getEventType() == MatchEvent.MatchEventType.RED_CARD) {
                    applyAutoSuspension(event, match);
                } else if (event.getEventType() == MatchEvent.MatchEventType.YELLOW_CARD) {
                    applyYellowCardDiscipline(event, match, settings);
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

    @Transactional
    public Match updateMatchScore(UUID matchId, com.leagueos.modules.competition.api.dto.UpdateMatchScoreRequest request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

        if (!match.getTenantId().equals(TenantContext.getCurrentTenant())) {
            throw new IllegalStateException("Match does not belong to the current tenant");
        }

        if (request.getHomeScore() != null) {
            match.setHomeScore(request.getHomeScore());
        }
        if (request.getAwayScore() != null) {
            match.setAwayScore(request.getAwayScore());
        }
        if (request.getStatus() != null) {
            match.setStatus(request.getStatus());
        } else {
            match.setStatus(Match.MatchStatus.FINISHED);
        }
        if (request.getIsDoubleForfeit() != null) {
            match.setIsDoubleForfeit(request.getIsDoubleForfeit());
        }

        if (match.getHomeScore() != null && match.getAwayScore() != null && !match.getHomeScore().equals(match.getAwayScore())) {
            match.setHomePenaltyScore(null);
            match.setAwayPenaltyScore(null);
            match.setPenaltyWinnerTeam(null);
        } else {
            if (request.getHomePenaltyScore() != null) {
                match.setHomePenaltyScore(request.getHomePenaltyScore());
            }
            if (request.getAwayPenaltyScore() != null) {
                match.setAwayPenaltyScore(request.getAwayPenaltyScore());
            }

            if (request.getPenaltyWinnerTeamId() != null) {
                Team penaltyWinner = teamRepository.findById(request.getPenaltyWinnerTeamId()).orElse(null);
                match.setPenaltyWinnerTeam(penaltyWinner);
            } else if (Boolean.TRUE.equals(request.getClearPenaltyWinner())) {
                match.setPenaltyWinnerTeam(null);
                match.setHomePenaltyScore(null);
                match.setAwayPenaltyScore(null);
            } else if (match.getHomePenaltyScore() != null && match.getAwayPenaltyScore() != null) {
                if (match.getHomePenaltyScore() > match.getAwayPenaltyScore()) {
                    match.setPenaltyWinnerTeam(match.getHomeTeam());
                } else if (match.getAwayPenaltyScore() > match.getHomePenaltyScore()) {
                    match.setPenaltyWinnerTeam(match.getAwayTeam());
                }
            }
        }

        Match savedMatch = matchRepository.save(match);

        if (MatchStage.PLAYOFFS.equals(savedMatch.getStage()) && savedMatch.getPlayoffTie() != null) {
            playoffService.resolveTie(savedMatch.getPlayoffTie().getId());
        }

        return savedMatch;
    }

    public List<Match> getMatchesByMatchday(Integer matchday) {
        return matchRepository.findByMatchday(matchday);
    }

    public List<MatchEvent> getMatchEvents(UUID matchId) {
        return matchEventRepository.findByMatchId(matchId);
    }

    private final com.leagueos.modules.league.persistence.SoccerFieldRepository soccerFieldRepository;
    private final com.leagueos.modules.referee.persistence.RefereeRepository refereeRepository;

    @Transactional
    public Match updateMatchSchedule(UUID matchId, UpdateMatchScheduleRequest request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

        if (!match.getTenantId().equals(TenantContext.getCurrentTenant())) {
            throw new IllegalStateException("Match does not belong to the current tenant");
        }

        match.setMatchDate(request.getMatchDate());

        if (request.getFieldId() != null) {
            com.leagueos.modules.league.domain.SoccerField field = soccerFieldRepository
                    .findByIdAndTenantId(request.getFieldId(), match.getTenantId())
                    .orElse(null);
            match.setField(field);
            if (field != null) {
                match.setLocation(field.getName());
            } else {
                match.setLocation(request.getLocation());
            }
        } else {
            match.setField(null);
            match.setLocation(request.getLocation());
        }

        if (request.getRefereeId() != null) {
            com.leagueos.modules.referee.domain.Referee referee = refereeRepository
                    .findByIdAndTenantId(request.getRefereeId(), match.getTenantId())
                    .orElse(null);
            match.setReferee(referee);
        } else {
            match.setReferee(null);
        }

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

        // Also record tournament-level suspension for isolated tournament tracking
        if (match.getSeason() != null && playerTournamentSuspensionRepository != null) {
            com.leagueos.modules.registration.domain.PlayerTournamentSuspension pts = new com.leagueos.modules.registration.domain.PlayerTournamentSuspension();
            pts.setTenantId(match.getTenantId());
            pts.setPlayer(player);
            pts.setSeason(match.getSeason());
            pts.setTotalMatchesAssigned(suspensionDuration);
            pts.setRemainingMatches(suspensionDuration);
            pts.setReason(event.getNotes() != null && !event.getNotes().isBlank() ? event.getNotes() : "Tarjeta Roja");
            playerTournamentSuspensionRepository.save(pts);

            check12MatchRule(player, match.getSeason().getId(), match.getTenantId());
        }
    }

    private void applyYellowCardDiscipline(MatchEvent event, Match match, TenantSettings settings) {
        if (event.getPlayer() == null || match.getSeason() == null || settings == null) return;
        if (!settings.isEnableAccumulatedYellowSuspensions()) return;

        int cardsPerSuspension = settings.getYellowCardsPerSuspension() > 0 ? settings.getYellowCardsPerSuspension() : 5;
        int count = matchEventRepository.countYellowCardsByPlayerAndSeason(event.getPlayer().getId(), match.getSeason().getId()) + 1;

        if (count % cardsPerSuspension == 0) {
            Player player = playerRepository.findById(event.getPlayer().getId()).orElse(null);
            if (player == null) return;

            com.leagueos.modules.registration.domain.PlayerTournamentSuspension pts = new com.leagueos.modules.registration.domain.PlayerTournamentSuspension();
            pts.setTenantId(match.getTenantId());
            pts.setPlayer(player);
            pts.setSeason(match.getSeason());
            pts.setTotalMatchesAssigned(1);
            pts.setRemainingMatches(1);
            pts.setReason("Acumulación de " + count + " tarjetas amarillas");
            playerTournamentSuspensionRepository.save(pts);

            // Also increment matchday suspension for safety
            int currentMatchday = match.getMatchday() != null ? match.getMatchday() : 0;
            player.setSuspendedUntilMatchday(currentMatchday + 1);
            playerRepository.save(player);

            check12MatchRule(player, match.getSeason().getId(), match.getTenantId());
        }
    }

    private void check12MatchRule(Player player, UUID seasonId, UUID tenantId) {
        TenantSettings settings = tenantSettingsService.getCurrentSettings();
        if (settings == null) return;
        int maxAllowed = settings.getMaxAccumulatedSuspensionMatchdays() > 0 ? settings.getMaxAccumulatedSuspensionMatchdays() : 12;

        Integer totalAssigned = playerTournamentSuspensionRepository.sumTotalMatchesAssignedByPlayerAndSeason(player.getId(), seasonId);
        if (totalAssigned != null && totalAssigned >= maxAllowed) {
            // Rule of 12 reached: automatically ban player for the rest of this tournament
            com.leagueos.modules.registration.domain.PlayerTournamentSuspension ban = new com.leagueos.modules.registration.domain.PlayerTournamentSuspension();
            ban.setTenantId(tenantId);
            ban.setPlayer(player);
            ban.setSeason(matchRepository.findById(seasonId).map(Match::getSeason).orElse(null));
            ban.setRemainingMatches(999);
            ban.setTotalMatchesAssigned(999);
            ban.setReason("Suspendido el resto del torneo por acumular " + totalAssigned + " partidos de suspensión (Regla de 12)");
            ban.setTournamentBanned(true);
            playerTournamentSuspensionRepository.save(ban);
        }
    }
}
