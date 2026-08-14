package com.leagueos.modules.competition.service;

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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FixtureGeneratorService {

    private final SeasonRepository seasonRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final MatchRepository matchRepository;

    @Transactional
    public List<Match> generateRoundRobinMatches(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        List<Team> teams = teamRegistrationRepository.findBySeasonId(seasonId).stream()
                .filter(reg -> reg.getStatus() == TeamRegistration.RegistrationStatus.APPROVED)
                .map(TeamRegistration::getTeam)
                .collect(Collectors.toList());

        if (teams.size() < 2) {
            throw new BusinessRuleException("At least 2 approved teams are required to generate a calendar");
        }

        Collections.shuffle(teams);

        // If odd number of teams, add a bye slot (null)
        if (teams.size() % 2 != 0) {
            teams.add(null);
        }

        int totalMatchdays = teams.size() - 1;
        int halfSize = teams.size() / 2;
        List<Match> generatedMatches = new ArrayList<>();

        // Start on the season's start date at 10:00 AM
        LocalDateTime currentMatchDate = season.getStartDate().atTime(10, 0);

        List<Team> rotation = new ArrayList<>(teams);

        for (int matchday = 1; matchday <= totalMatchdays; matchday++) {
            for (int i = 0; i < halfSize; i++) {
                Team home = rotation.get(i);
                Team away = rotation.get(teams.size() - 1 - i);

                // Alternate home/away for the pinned first team
                if (i == 0 && matchday % 2 == 0) {
                    Team temp = home;
                    home = away;
                    away = temp;
                }

                if (home != null && away != null) {
                    Match match = new Match();
                    match.setSeason(season);
                    match.setMatchday(matchday);
                    match.setHomeTeam(home);
                    match.setAwayTeam(away);
                    match.setMatchDate(currentMatchDate);
                    match.setStatus(Match.MatchStatus.SCHEDULED);
                    match.setStage(MatchStage.REGULAR);
                    match.setTenantId(season.getTenantId());
                    generatedMatches.add(match);
                }
            }

            // Rotate all teams except the first (round-robin algorithm)
            Team last = rotation.remove(rotation.size() - 1);
            rotation.add(1, last);

            currentMatchDate = currentMatchDate.plusDays(7);
        }

        return matchRepository.saveAll(generatedMatches);
    }
}
