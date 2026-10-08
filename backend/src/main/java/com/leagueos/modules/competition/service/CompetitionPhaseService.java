package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.TeamStandingDTO;
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
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompetitionPhaseService {

    private final StatsService statsService;
    private final SeasonRepository seasonRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final MatchRepository matchRepository;

    /**
     * Splits a season into Phase 2:
     * - Top half (N/2, rounded down if odd) goes to CAMPEONATO.
     * - Bottom half (remaining teams) goes to PERMANENCIA.
     * Generates a 1-leg round-robin within each group.
     */
    @Transactional
    public void splitSeasonIntoPhase2(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new ResourceNotFoundException("Season not found: " + seasonId));

        List<Match> existingMatches = matchRepository.findBySeasonId(seasonId);
        boolean alreadySplit = existingMatches.stream().anyMatch(m -> m.getPhaseGroup() != null);
        if (alreadySplit) {
            throw new BusinessRuleException("La temporada ya ha sido dividida en Fase 2 previamente.");
        }

        List<TeamStandingDTO> standings = statsService.calculateStandings(seasonId);
        int totalTeams = standings.size();
        if (totalTeams < 2) {
            throw new IllegalArgumentException("Se requieren al menos 2 equipos para realizar la partición de fase.");
        }

        // Exact split rule: If N is odd, leftover team goes down to Permanencia
        int championshipCount = totalTeams / 2;

        List<Team> championshipTeams = new ArrayList<>();
        List<Team> permanenciaTeams = new ArrayList<>();

        for (int i = 0; i < totalTeams; i++) {
            TeamStandingDTO dto = standings.get(i);
            TeamRegistration reg = teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED)
                    .stream()
                    .filter(r -> r.getTeam().getId().equals(dto.getId()))
                    .findFirst()
                    .orElse(null);

            if (reg != null) {
                if (i < championshipCount) {
                    reg.setPhaseGroup("CAMPEONATO");
                    reg.setPhaseSeed(i + 1);
                    championshipTeams.add(reg.getTeam());
                } else {
                    reg.setPhaseGroup("PERMANENCIA");
                    reg.setPhaseSeed(i + 1);
                    permanenciaTeams.add(reg.getTeam());
                }
                teamRegistrationRepository.save(reg);
            }
        }

        // Get max matchday used so far to continue matchday numbers consecutively
        int maxMatchday = existingMatches.stream()
                .map(Match::getMatchday)
                .filter(m -> m != null)
                .max(Integer::compareTo)
                .orElse(0);

        generateGroupFixtures(season, championshipTeams, "CAMPEONATO", maxMatchday + 1);
        generateGroupFixtures(season, permanenciaTeams, "PERMANENCIA", maxMatchday + 1);
    }

    private void generateGroupFixtures(Season season, List<Team> teams, String phaseGroup, int startingMatchday) {
        if (teams.size() < 2) return;

        List<Team> roundRobinList = new ArrayList<>(teams);
        if (roundRobinList.size() % 2 != 0) {
            roundRobinList.add(null); // BYE
        }

        int numTeams = roundRobinList.size();
        int rounds = numTeams - 1;
        int halfSize = numTeams / 2;

        for (int round = 0; round < rounds; round++) {
            int currentMatchday = startingMatchday + round;
            for (int i = 0; i < halfSize; i++) {
                Team home = roundRobinList.get(i);
                Team away = roundRobinList.get(numTeams - 1 - i);

                if (home != null && away != null) {
                    Match match = new Match();
                    match.setTenantId(season.getTenantId());
                    match.setSeason(season);
                    match.setHomeTeam(home);
                    match.setAwayTeam(away);
                    match.setMatchday(currentMatchday);
                    match.setStage(MatchStage.REGULAR);
                    match.setStatus(Match.MatchStatus.SCHEDULED);
                    match.setPhaseGroup(phaseGroup);
                    matchRepository.save(match);
                }
            }

            // Rotate list (keep first fixed)
            Team last = roundRobinList.remove(numTeams - 1);
            roundRobinList.add(1, last);
        }
    }
}
