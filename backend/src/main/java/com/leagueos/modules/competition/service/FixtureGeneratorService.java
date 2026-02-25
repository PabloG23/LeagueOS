package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
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
                .orElseThrow(() -> new RuntimeException("Season not found: " + seasonId));

        // Get approved teams
        List<Team> teams = teamRegistrationRepository.findBySeasonId(seasonId).stream()
                .filter(reg -> reg.getStatus() == TeamRegistration.RegistrationStatus.APPROVED)
                .map(TeamRegistration::getTeam)
                .collect(Collectors.toList());

        if (teams.size() < 2) {
            throw new RuntimeException("At least 2 approved teams are required to generate a calendar");
        }

        // Shuffle for randomness
        Collections.shuffle(teams);

        // If odd number of teams, add a dummy team "null" for a "Bye"
        if (teams.size() % 2 != 0) {
            teams.add(null);
        }

        int MathdaysTotal = teams.size() - 1;
        int halfSize = teams.size() / 2;
        List<Match> generatedMatches = new ArrayList<>();
        
        // Starts on the season's start date + 1 day at 10 AM arbitrary time
        LocalDateTime currentMatchDate = season.getStartDate().atTime(10, 0); 

        List<Team> teamsCopy = new ArrayList<>(teams);

        for (int matchday = 1; matchday <= MathdaysTotal; matchday++) {
            for (int i = 0; i < halfSize; i++) {
                Team home = teamsCopy.get(i);
                Team away = teamsCopy.get(teams.size() - 1 - i);

                // Alternating home/away for the fixed first team
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
                    match.setTenantId(season.getTenantId());
                    generatedMatches.add(match);
                }
            }

            // Rotate array (keep first element fixed)
            Team last = teamsCopy.remove(teamsCopy.size() - 1);
            teamsCopy.add(1, last);
            
            // Advance date by 7 days per matchday
            currentMatchDate = currentMatchDate.plusDays(7);
        }

        return matchRepository.saveAll(generatedMatches);
    }
}
