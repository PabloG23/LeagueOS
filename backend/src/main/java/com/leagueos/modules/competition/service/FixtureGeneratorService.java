package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.MatchPreviewDTO;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.shared.domain.exception.BusinessRuleException;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FixtureGeneratorService {

    private final SeasonRepository seasonRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final MatchRepository matchRepository;

    // -------------------------------------------------------------------------
    // Preview — computes fixtures in memory, NO persistence
    // Time:  O(n²) — minimum necessary to enumerate n*(n-1)/2 matches
    // Space: O(n)  — circular rotation array + pre-allocated output list
    // -------------------------------------------------------------------------

    /**
     * Computes a full round-robin fixture list using the circular rotation algorithm.
     * Does NOT persist anything to the database.
     *
     * @param seasonId the season to preview fixtures for
     * @return list of MatchPreviewDTO with matchDate=null ("Por definir")
     */
    public List<MatchPreviewDTO> previewRoundRobinFixtures(UUID seasonId) {
        seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        // Load approved teams once — O(n) query, O(n) memory
        List<Team> teams = teamRegistrationRepository.findBySeasonId(seasonId).stream()
                .filter(reg -> reg.getStatus() == TeamRegistration.RegistrationStatus.APPROVED)
                .map(TeamRegistration::getTeam)
                .collect(Collectors.toCollection(ArrayList::new));

        if (teams.size() < 2) {
            throw new BusinessRuleException("Se necesitan al menos 2 equipos aprobados para generar el calendario.");
        }

        // Fisher-Yates in-place shuffle — O(n) time, O(1) extra space
        fisherYatesShuffle(teams, new Random());

        // Add virtual BYE slot for odd number of teams — O(1)
        if (teams.size() % 2 != 0) {
            teams.add(null);
        }

        int n = teams.size();
        int totalMatchdays = n - 1;
        int halfSize = n / 2;

        // Pre-allocate to exact capacity to avoid ArrayList internal resizing
        // Total matches = halfSize * totalMatchdays = n*(n-1)/2
        List<MatchPreviewDTO> result = new ArrayList<>(halfSize * totalMatchdays);

        // Circular rotation array — O(n) extra space, mutated in-place each round
        List<Team> rotation = new ArrayList<>(teams);

        for (int matchday = 1; matchday <= totalMatchdays; matchday++) {
            for (int i = 0; i < halfSize; i++) {
                Team home = rotation.get(i);
                Team away = rotation.get(n - 1 - i);

                // Alternate home/away for the pinned first team to balance home games
                if (i == 0 && matchday % 2 == 0) {
                    Team tmp = home;
                    home = away;
                    away = tmp;
                }

                // Skip BYE slots (null team)
                if (home != null && away != null) {
                    result.add(new MatchPreviewDTO(
                            matchday,
                            home.getId(), home.getName(),
                            away.getId(), away.getName(),
                            null // matchDate intentionally null → "Por definir"
                    ));
                }
            }

            // Rotate: remove last element and insert at index 1 (pin index 0)
            // O(n) per round — acceptable since total is O(n²) anyway
            Team last = rotation.remove(n - 1);
            rotation.add(1, last);
        }

        return result;
    }

    // -------------------------------------------------------------------------
    // Generate — calls preview, maps DTOs to entities, batch-saves in one TX
    // Time:  O(n²) — dominated by fixture computation
    // Space: O(n²) — all Match entities held in memory before single saveAll()
    // -------------------------------------------------------------------------

    @Transactional
    public List<Match> generateRoundRobinMatches(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        List<MatchPreviewDTO> previews = previewRoundRobinFixtures(seasonId);

        // Build UUID → Team index — O(n) build, O(1) lookup, avoids O(n) per-match search
        Map<UUID, Team> teamIndex = teamRegistrationRepository.findBySeasonId(seasonId).stream()
                .filter(reg -> reg.getStatus() == TeamRegistration.RegistrationStatus.APPROVED)
                .collect(Collectors.toMap(
                        reg -> reg.getTeam().getId(),
                        TeamRegistration::getTeam
                ));

        List<Match> matches = new ArrayList<>(previews.size());
        for (MatchPreviewDTO dto : previews) {
            Team home = teamIndex.get(dto.getHomeTeamId());
            Team away = teamIndex.get(dto.getAwayTeamId());
            if (home == null || away == null) continue;

            Match match = new Match();
            match.setSeason(season);
            match.setMatchday(dto.getMatchday());
            match.setHomeTeam(home);
            match.setAwayTeam(away);
            match.setMatchDate(null); // Dates assigned manually by admin
            match.setStatus(Match.MatchStatus.SCHEDULED);
            match.setStage(MatchStage.REGULAR);
            match.setTenantId(season.getTenantId());
            matches.add(match);
        }

        // Single batch insert — O(1) DB round trips regardless of match count
        return matchRepository.saveAll(matches);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Fisher-Yates in-place shuffle.
     * Time: O(n), Space: O(1) extra
     */
    private static <T> void fisherYatesShuffle(List<T> list, Random rng) {
        for (int i = list.size() - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            T tmp = list.get(i);
            list.set(i, list.get(j));
            list.set(j, tmp);
        }
    }
}
