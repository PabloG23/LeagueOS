package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.domain.PlayoffRound;
import com.leagueos.modules.competition.domain.PlayoffTie;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.competition.persistence.PlayoffTieRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlayoffService {

    private final PlayoffTieRepository playoffTieRepository;
    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;

    @Transactional
    public void generateBracket(UUID seasonId, PlayoffRound startingRound, List<UUID> seededTeamIds, int numLegs) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new IllegalArgumentException("Season not found"));

        // Fetch teams in seed order
        List<Team> teams = new ArrayList<>();
        for (UUID teamId : seededTeamIds) {
            teams.add(teamRepository.findByIdAndTenantId(teamId, season.getTenantId())
                    .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId)));
        }

        int expectedTeams = switch (startingRound) {
            case ROUND_OF_16 -> 16;
            case QUARTER_FINALS -> 8;
            case SEMI_FINALS -> 4;
            case FINAL -> 2;
            default -> throw new IllegalArgumentException("Unsupported starting round");
        };

        if (teams.size() != expectedTeams) {
            throw new IllegalArgumentException("Expected " + expectedTeams + " teams for " + startingRound + ", got " + teams.size());
        }

        // Generate full tree structure from Final upwards
        PlayoffTie finalTie = createTie(season, PlayoffRound.FINAL, null, null, null);
        
        if (startingRound == PlayoffRound.FINAL) {
            finalTie.setHomeSeedTeam(teams.get(0));
            finalTie.setAwaySeedTeam(teams.get(1));
            createMatchesForTie(finalTie, numLegs);
            playoffTieRepository.save(finalTie);
            return;
        }

        PlayoffTie semi1 = createTie(season, PlayoffRound.SEMI_FINALS, null, null, finalTie);
        PlayoffTie semi2 = createTie(season, PlayoffRound.SEMI_FINALS, null, null, finalTie);
        
        if (startingRound == PlayoffRound.SEMI_FINALS) {
            semi1.setHomeSeedTeam(teams.get(0));
            semi1.setAwaySeedTeam(teams.get(3));
            semi2.setHomeSeedTeam(teams.get(1));
            semi2.setAwaySeedTeam(teams.get(2));
            createMatchesForTie(semi1, numLegs);
            createMatchesForTie(semi2, numLegs);
            playoffTieRepository.save(semi1);
            playoffTieRepository.save(semi2);
            return;
        }

        PlayoffTie qf1 = createTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi1);
        PlayoffTie qf2 = createTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi1);
        PlayoffTie qf3 = createTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi2);
        PlayoffTie qf4 = createTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi2);

        if (startingRound == PlayoffRound.QUARTER_FINALS) {
            qf1.setHomeSeedTeam(teams.get(0)); qf1.setAwaySeedTeam(teams.get(7));
            qf2.setHomeSeedTeam(teams.get(3)); qf2.setAwaySeedTeam(teams.get(4));
            qf3.setHomeSeedTeam(teams.get(1)); qf3.setAwaySeedTeam(teams.get(6));
            qf4.setHomeSeedTeam(teams.get(2)); qf4.setAwaySeedTeam(teams.get(5));
            createMatchesForTie(qf1, numLegs);
            createMatchesForTie(qf2, numLegs);
            createMatchesForTie(qf3, numLegs);
            createMatchesForTie(qf4, numLegs);
            playoffTieRepository.saveAll(List.of(qf1, qf2, qf3, qf4));
            return;
        }

        // ROUND_OF_16
        PlayoffTie r16_1 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(0), teams.get(15), qf1);
        PlayoffTie r16_2 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(7), teams.get(8), qf1);
        PlayoffTie r16_3 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(3), teams.get(12), qf2);
        PlayoffTie r16_4 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(4), teams.get(11), qf2);
        PlayoffTie r16_5 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(1), teams.get(14), qf3);
        PlayoffTie r16_6 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(6), teams.get(9), qf3);
        PlayoffTie r16_7 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(2), teams.get(13), qf4);
        PlayoffTie r16_8 = createTie(season, PlayoffRound.ROUND_OF_16, teams.get(5), teams.get(10), qf4);

        createMatchesForTie(r16_1, numLegs);
        createMatchesForTie(r16_2, numLegs);
        createMatchesForTie(r16_3, numLegs);
        createMatchesForTie(r16_4, numLegs);
        createMatchesForTie(r16_5, numLegs);
        createMatchesForTie(r16_6, numLegs);
        createMatchesForTie(r16_7, numLegs);
        createMatchesForTie(r16_8, numLegs);
        
        playoffTieRepository.saveAll(List.of(r16_1, r16_2, r16_3, r16_4, r16_5, r16_6, r16_7, r16_8));
    }

    private PlayoffTie createTie(Season season, PlayoffRound round, Team home, Team away, PlayoffTie nextTie) {
        PlayoffTie tie = new PlayoffTie();
        tie.setSeason(season);
        tie.setTenantId(season.getTenantId()); // Critical: Set tenant ID for BaseEntity
        tie.setRound(round);
        tie.setHomeSeedTeam(home);
        tie.setAwaySeedTeam(away);
        if (nextTie != null) {
            // Because BaseEntity saves UUID on save, we must ensure nextTie is saved
            nextTie = playoffTieRepository.save(nextTie);
            tie.setNextTieId(nextTie.getId());
        }
        return playoffTieRepository.save(tie);
    }

    private void createMatchesForTie(PlayoffTie tie, int numLegs) {
        if (tie.getHomeSeedTeam() == null || tie.getAwaySeedTeam() == null) {
            return;
        }

        for (int i = 1; i <= numLegs; i++) {
            Match match = new Match();
            match.setSeason(tie.getSeason());
            match.setTenantId(tie.getSeason().getTenantId()); // Critical: Set tenant ID
            match.setStage(MatchStage.PLAYOFFS);
            match.setPlayoffTie(tie);
            match.setLegNumber(i);
            
            // Reverse home/away for leg 2
            if (i == 2 && numLegs == 2) {
                match.setHomeTeam(tie.getAwaySeedTeam());
                match.setAwayTeam(tie.getHomeSeedTeam());
            } else {
                match.setHomeTeam(tie.getHomeSeedTeam());
                match.setAwayTeam(tie.getAwaySeedTeam());
            }
            matchRepository.save(match);
        }
    }

    @Transactional
    public void resolveTie(UUID tieId) {
        PlayoffTie tie = playoffTieRepository.findById(tieId)
                .orElseThrow(() -> new IllegalArgumentException("Tie not found"));
        
        List<Match> matchLegs = matchRepository.findByPlayoffTieId(tieId);
        
        boolean allFinished = matchLegs.stream().allMatch(m -> m.getStatus() == Match.MatchStatus.FINISHED);
        if (!allFinished) return;
        
        int team1Score = 0;
        int team2Score = 0;
        
        Team team1 = tie.getHomeSeedTeam();
        Team team2 = tie.getAwaySeedTeam();

        for (Match m : matchLegs) {
            if (m.getHomeTeam().getId().equals(team1.getId())) {
                team1Score += m.getHomeScore() != null ? m.getHomeScore() : 0;
                team2Score += m.getAwayScore() != null ? m.getAwayScore() : 0;
            } else {
                team2Score += m.getHomeScore() != null ? m.getHomeScore() : 0;
                team1Score += m.getAwayScore() != null ? m.getAwayScore() : 0;
            }
        }

        Team winner = null;
        if (team1Score > team2Score) winner = team1;
        else if (team2Score > team1Score) winner = team2;
        else {
            // Simplified tiebreaker: higher seed wins
            winner = team1; 
        }

        tie.setAdvancingTeam(winner);
        playoffTieRepository.save(tie);

        if (tie.getNextTieId() != null) {
            PlayoffTie nextTie = playoffTieRepository.findById(tie.getNextTieId())
                    .orElse(null);
            if (nextTie != null) {
                if (nextTie.getHomeSeedTeam() == null) {
                    nextTie.setHomeSeedTeam(winner);
                } else if (nextTie.getAwaySeedTeam() == null) {
                    nextTie.setAwaySeedTeam(winner);
                    createMatchesForTie(nextTie, matchLegs.size()); 
                }
                playoffTieRepository.save(nextTie);
            }
        }
    }

    @Transactional
    public void deleteBracket(UUID seasonId) {
        // Find all play-off ties for the season
        List<PlayoffTie> ties = playoffTieRepository.findBySeasonId(seasonId);
        
        // Disconnect foreign keys to other ties
        for (PlayoffTie tie : ties) {
            tie.setNextTieId(null);
        }
        playoffTieRepository.saveAll(ties);

        // Delete matches
        matchRepository.deleteBySeasonIdAndStage(seasonId, MatchStage.PLAYOFFS);

        // Delete ties
        playoffTieRepository.deleteBySeasonId(seasonId);
    }
}
