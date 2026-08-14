package com.leagueos.modules.competition.service;

import com.leagueos.core.sport.domain.SportRulesService;
import com.leagueos.core.sport.domain.SportRulesStrategy;
import com.leagueos.modules.competition.api.dto.PlayerProfileStatsDTO;
import com.leagueos.modules.competition.api.dto.PlayerStatDTO;
import com.leagueos.modules.competition.api.dto.TeamStandingDTO;
import com.leagueos.modules.competition.api.dto.TeamStatDTO;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final MatchEventRepository matchEventRepository;
    private final MatchRepository matchRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final TenantSettingsService tenantSettingsService;
    private final SportRulesService sportRulesService;

    @Transactional(readOnly = true)
    public List<PlayerStatDTO> getTopRedCardsByPlayerForSeason(List<UUID> seasonIds) {
        return assignRanks(matchEventRepository.countRedCardsByPlayerForSeason(seasonIds),
                PlayerStatDTO::getRedCards, (dto, rank) -> dto.setRank(rank));
    }

    @Transactional(readOnly = true)
    public List<PlayerStatDTO> getTopRedCardsByPlayerForMatchday(List<UUID> seasonIds, Integer matchday) {
        if (matchday == null) return List.of();
        return assignRanks(matchEventRepository.countRedCardsByPlayerForMatchday(seasonIds, matchday),
                PlayerStatDTO::getRedCards, (dto, rank) -> dto.setRank(rank));
    }

    @Transactional(readOnly = true)
    public List<TeamStatDTO> getTopRedCardsByTeamForSeason(List<UUID> seasonIds) {
        return assignRanks(matchEventRepository.countRedCardsByTeamForSeason(seasonIds),
                TeamStatDTO::getRedCards, (dto, rank) -> dto.setRank(rank));
    }

    @Transactional(readOnly = true)
    public PlayerProfileStatsDTO getPlayerProfileStats(UUID playerId) {
        int goals = matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.GOAL);
        int yellowCards = matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.YELLOW_CARD);
        int redCards = matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.RED_CARD);

        int matchesPlayed = matchEventRepository.countMatchesByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.APPEARANCE);

        // Fallback: count distinct matches where the player appeared (only APPEARANCE events are reliable)
        // Note: summing other event types risks double-counting matches where a player scored AND got carded.
        if (matchesPlayed == 0) {
            matchesPlayed = matchEventRepository.countDistinctMatchesByPlayerId(playerId);
        }

        return PlayerProfileStatsDTO.builder()
                .playerId(playerId)
                .goals(goals)
                .yellowCards(yellowCards)
                .redCards(redCards)
                .matchesPlayed(matchesPlayed)
                .suspendedUntilMatchday(null)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeamStandingDTO> calculateStandings(UUID seasonId) {
        List<TeamRegistration> registrations = teamRegistrationRepository.findBySeasonIdAndStatus(
                seasonId, TeamRegistration.RegistrationStatus.APPROVED);

        Map<UUID, TeamStandingDTO> standingsMap = new HashMap<>();
        for (TeamRegistration reg : registrations) {
            standingsMap.put(reg.getTeam().getId(), TeamStandingDTO.builder()
                    .id(reg.getTeam().getId())
                    .team(reg.getTeam().getName())
                    .played(0).won(0).drawn(0).lost(0)
                    .goalsFor(0).goalsAgainst(0).goalDifference(0)
                    .points(0)
                    .form(new ArrayList<>())
                    .build());
        }

        List<Match> matches = matchRepository.findBySeasonIdAndStatusIn(seasonId, List.of(Match.MatchStatus.FINISHED));
        matches.sort(Comparator.nullsLast(Comparator.comparing(Match::getMatchDate)));

        TenantSettings settings = tenantSettingsService.getCurrentSettings();
        int winPoints = settings.getWinPointsOnWin();
        SportRulesStrategy rulesStrategy = sportRulesService.getStrategy("SOCCER")
                .orElseThrow(() -> new IllegalStateException("No se encontró una estrategia de reglas para el deporte SOCCER."));

        for (Match match : matches) {
            if (match.getHomeTeam() == null || match.getAwayTeam() == null) continue;
            TeamStandingDTO home = standingsMap.get(match.getHomeTeam().getId());
            TeamStandingDTO away = standingsMap.get(match.getAwayTeam().getId());
            if (home == null || away == null) continue;

            int homeScore = match.getHomeScore() != null ? match.getHomeScore() : 0;
            int awayScore = match.getAwayScore() != null ? match.getAwayScore() : 0;

            applyGoalStats(home, homeScore, awayScore);
            applyGoalStats(away, awayScore, homeScore);

            applyMatchResult(home, away, match, homeScore, awayScore, rulesStrategy, winPoints);
        }

        // Truncate form to last 5 matches
        standingsMap.values().forEach(s -> {
            if (s.getForm().size() > 5) {
                s.setForm(s.getForm().subList(s.getForm().size() - 5, s.getForm().size()));
            }
        });

        // Sort and assign ranks
        List<TeamStandingDTO> sorted = standingsMap.values().stream()
                .sorted(Comparator
                        .comparingInt(TeamStandingDTO::getPoints).reversed()
                        .thenComparingInt(TeamStandingDTO::getGoalDifference).reversed()
                        .thenComparingInt(TeamStandingDTO::getGoalsFor).reversed())
                .collect(Collectors.toList());

        for (int i = 0; i < sorted.size(); i++) {
            sorted.get(i).setRank(i + 1);
        }

        return sorted;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Generic rank assignment. Items must already be ordered by the ranking value (descending).
     * Ties in value produce equal ranks (dense ranking style).
     */
    private <T> List<T> assignRanks(List<T> stats,
                                     java.util.function.Function<T, Long> valueExtractor,
                                     java.util.function.BiConsumer<T, Integer> rankSetter) {
        int currentRank = 1;
        Long previousValue = null;
        for (int i = 0; i < stats.size(); i++) {
            T stat = stats.get(i);
            Long value = valueExtractor.apply(stat);
            if (!value.equals(previousValue)) {
                currentRank = i + 1;
            }
            rankSetter.accept(stat, currentRank);
            previousValue = value;
        }
        return stats;
    }

    private void applyGoalStats(TeamStandingDTO team, int goalsFor, int goalsAgainst) {
        team.setPlayed(team.getPlayed() + 1);
        team.setGoalsFor(team.getGoalsFor() + goalsFor);
        team.setGoalsAgainst(team.getGoalsAgainst() + goalsAgainst);
        team.setGoalDifference(team.getGoalsFor() - team.getGoalsAgainst());
    }

    private void applyMatchResult(TeamStandingDTO home, TeamStandingDTO away,
                                   Match match, int homeScore, int awayScore,
                                   SportRulesStrategy rules, int winPoints) {
        if (Boolean.TRUE.equals(match.getIsDoubleForfeit())) {
            home.setLost(home.getLost() + 1);
            home.getForm().add("L");
            away.setLost(away.getLost() + 1);
            away.getForm().add("L");
            return;
        }

        if (homeScore > awayScore) {
            int pts = rules.calculateMatchPoints(buildResult(homeScore, awayScore, true), winPoints);
            home.setWon(home.getWon() + 1);
            home.setPoints(home.getPoints() + pts);
            home.getForm().add("W");
            away.setLost(away.getLost() + 1);
            away.getForm().add("L");
        } else if (homeScore < awayScore) {
            int pts = rules.calculateMatchPoints(buildResult(homeScore, awayScore, false), winPoints);
            away.setWon(away.getWon() + 1);
            away.setPoints(away.getPoints() + pts);
            away.getForm().add("W");
            home.setLost(home.getLost() + 1);
            home.getForm().add("L");
        } else {
            int pts = rules.calculateMatchPoints(buildResult(homeScore, awayScore, true), winPoints);
            home.setDrawn(home.getDrawn() + 1);
            home.setPoints(home.getPoints() + pts);
            home.getForm().add("D");
            away.setDrawn(away.getDrawn() + 1);
            away.setPoints(away.getPoints() + pts);
            away.getForm().add("D");
        }
    }

    private SportRulesStrategy.MatchResult buildResult(int homeScore, int awayScore, boolean isHomeTeam) {
        return SportRulesStrategy.MatchResult.builder()
                .homeScore(homeScore)
                .awayScore(awayScore)
                .isHomeTeam(isHomeTeam)
                .build();
    }
}
