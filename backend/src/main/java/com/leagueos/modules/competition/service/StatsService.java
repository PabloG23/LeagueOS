package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.PlayerProfileStatsDTO;
import com.leagueos.modules.competition.api.dto.PlayerStatDTO;
import com.leagueos.modules.competition.api.dto.TeamStatDTO;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.leagueos.modules.competition.api.dto.TeamStandingDTO;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final MatchEventRepository matchEventRepository;
    private final MatchRepository matchRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;

    @Transactional(readOnly = true)
    public List<PlayerStatDTO> getTopRedCardsByPlayerForSeason(List<UUID> seasonIds) {
        List<PlayerStatDTO> stats = matchEventRepository.countRedCardsByPlayerForSeason(seasonIds);
        return rankPlayerStats(stats);
    }

    @Transactional(readOnly = true)
    public List<PlayerStatDTO> getTopRedCardsByPlayerForMatchday(List<UUID> seasonIds, Integer matchday) {
        if (matchday == null) return List.of();
        List<PlayerStatDTO> stats = matchEventRepository.countRedCardsByPlayerForMatchday(seasonIds, matchday);
        return rankPlayerStats(stats);
    }

    @Transactional(readOnly = true)
    public List<TeamStatDTO> getTopRedCardsByTeamForSeason(List<UUID> seasonIds) {
        List<TeamStatDTO> stats = matchEventRepository.countRedCardsByTeamForSeason(seasonIds);
        return rankTeamStats(stats);
    }

    @Transactional(readOnly = true)
    public PlayerProfileStatsDTO getPlayerProfileStats(UUID playerId) {
        int goals = matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.GOAL);
        int yellowCards = matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.YELLOW_CARD);
        int redCards = matchEventRepository.countEventsByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.RED_CARD);
        
        int matchesPlayed = matchEventRepository.countMatchesByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.APPEARANCE);
        
        // If appearance wasn't explicitly logged, we might fallback to checking if any event exists per match, but appearance is standard.
        if(matchesPlayed == 0) {
            // Count distinct matches where the player had any event (goal, card) just in case
            matchesPlayed = matchEventRepository.countMatchesByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.GOAL) + 
                            matchEventRepository.countMatchesByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.YELLOW_CARD) + 
                            matchEventRepository.countMatchesByPlayerIdAndEventType(playerId, MatchEvent.MatchEventType.RED_CARD);
        }

        return PlayerProfileStatsDTO.builder()
                .playerId(playerId)
                .goals(goals)
                .yellowCards(yellowCards)
                .redCards(redCards)
                .matchesPlayed(matchesPlayed > 0 ? matchesPlayed : 0) // Basic fallback
                .suspendedUntilMatchday(null) // Suspension logic is out of scope for basic stats
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeamStandingDTO> calculateStandings(UUID seasonId) {
        // 1. Initialize map of teams
        List<TeamRegistration> teams = teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED);
        Map<UUID, TeamStandingDTO> standingsMap = new HashMap<>();

        for (TeamRegistration reg : teams) {
            standingsMap.put(reg.getTeam().getId(), TeamStandingDTO.builder()
                    .id(reg.getTeam().getId())
                    .team(reg.getTeam().getName())
                    .played(0).won(0).drawn(0).lost(0)
                    .goalsFor(0).goalsAgainst(0).goalDifference(0)
                    .points(0)
                    .form(new ArrayList<>())
                    .build());
        }

        // 2. Fetch completed matches
        List<Match> matches = matchRepository.findBySeasonIdAndStatusIn(seasonId, List.of(Match.MatchStatus.FINISHED));

        // Sort matches by date to calculate form correctly
        matches.sort((m1, m2) -> {
            if (m1.getMatchDate() == null || m2.getMatchDate() == null) return 0;
            return m1.getMatchDate().compareTo(m2.getMatchDate());
        });

        // 3. Process matches
        for (Match match : matches) {
            if (match.getHomeTeam() == null || match.getAwayTeam() == null) continue;
            
            TeamStandingDTO home = standingsMap.get(match.getHomeTeam().getId());
            TeamStandingDTO away = standingsMap.get(match.getAwayTeam().getId());

            if (home == null || away == null) continue;

            int homeScore = match.getHomeScore() != null ? match.getHomeScore() : 0;
            int awayScore = match.getAwayScore() != null ? match.getAwayScore() : 0;

            home.setPlayed(home.getPlayed() + 1);
            away.setPlayed(away.getPlayed() + 1);

            home.setGoalsFor(home.getGoalsFor() + homeScore);
            home.setGoalsAgainst(home.getGoalsAgainst() + awayScore);
            home.setGoalDifference(home.getGoalsFor() - home.getGoalsAgainst());

            away.setGoalsFor(away.getGoalsFor() + awayScore);
            away.setGoalsAgainst(away.getGoalsAgainst() + homeScore);
            away.setGoalDifference(away.getGoalsFor() - away.getGoalsAgainst());

            if (Boolean.TRUE.equals(match.getIsDoubleForfeit())) {
                home.setLost(home.getLost() + 1);
                home.getForm().add("L");

                away.setLost(away.getLost() + 1);
                away.getForm().add("L");
            } else if (homeScore > awayScore) {
                home.setWon(home.getWon() + 1);
                home.setPoints(home.getPoints() + 3);
                home.getForm().add("W");

                away.setLost(away.getLost() + 1);
                away.getForm().add("L");
            } else if (homeScore < awayScore) {
                away.setWon(away.getWon() + 1);
                away.setPoints(away.getPoints() + 3);
                away.getForm().add("W");

                home.setLost(home.getLost() + 1);
                home.getForm().add("L");
            } else {
                home.setDrawn(home.getDrawn() + 1);
                home.setPoints(home.getPoints() + 1);
                home.getForm().add("D");

                away.setDrawn(away.getDrawn() + 1);
                away.setPoints(away.getPoints() + 1);
                away.getForm().add("D");
            }
        }

        // 4. Truncate form to last 5 matches
        for (TeamStandingDTO standing : standingsMap.values()) {
            if (standing.getForm().size() > 5) {
                standing.setForm(standing.getForm().subList(standing.getForm().size() - 5, standing.getForm().size()));
            }
        }

        // 5. Sort and assign rank
        List<TeamStandingDTO> sortedStandings = standingsMap.values().stream()
                .sorted((a, b) -> {
                    if (a.getPoints() != b.getPoints()) return Integer.compare(b.getPoints(), a.getPoints());
                    if (a.getGoalDifference() != b.getGoalDifference()) return Integer.compare(b.getGoalDifference(), a.getGoalDifference());
                    return Integer.compare(b.getGoalsFor(), a.getGoalsFor());
                })
                .collect(Collectors.toList());

        for (int i = 0; i < sortedStandings.size(); i++) {
            sortedStandings.get(i).setRank(i + 1);
        }

        return sortedStandings;
    }

    private List<PlayerStatDTO> rankPlayerStats(List<PlayerStatDTO> stats) {
        int currentRank = 1;
        Long previousValue = -1L;
        for (int i = 0; i < stats.size(); i++) {
            PlayerStatDTO stat = stats.get(i);
            if (!stat.getRedCards().equals(previousValue)) {
                currentRank = i + 1;
            }
            stat.setRank(currentRank);
            previousValue = stat.getRedCards();
        }
        return stats;
    }

    private List<TeamStatDTO> rankTeamStats(List<TeamStatDTO> stats) {
        int currentRank = 1;
        Long previousValue = -1L;
        for (int i = 0; i < stats.size(); i++) {
            TeamStatDTO stat = stats.get(i);
            if (!stat.getRedCards().equals(previousValue)) {
                currentRank = i + 1;
            }
            stat.setRank(currentRank);
            previousValue = stat.getRedCards();
        }
        return stats;
    }
}
