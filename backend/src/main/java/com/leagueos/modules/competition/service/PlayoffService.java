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
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlayoffService {

    private final PlayoffTieRepository playoffTieRepository;
    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;

    /**
     * Seed matchups per round (0-based indices into the seededTeamIds list).
     * Read as: {homeSeedIndex, awaySeedIndex}.
     */
    private static final Map<PlayoffRound, int[][]> SEEDING = Map.of(
            PlayoffRound.FINAL,          new int[][]{{0, 1}},
            PlayoffRound.SEMI_FINALS,    new int[][]{{0, 3}, {1, 2}},
            PlayoffRound.QUARTER_FINALS, new int[][]{{0, 7}, {3, 4}, {1, 6}, {2, 5}},
            PlayoffRound.ROUND_OF_16,    new int[][]{{0, 15}, {7, 8}, {3, 12}, {4, 11},
                                                     {1, 14}, {6, 9}, {2, 13}, {5, 10}},
            PlayoffRound.ROUND_OF_32,    new int[][]{
                    {0, 31}, {15, 16}, {7, 24}, {8, 23}, {3, 28}, {12, 19}, {4, 27}, {11, 20},
                    {1, 30}, {14, 17}, {6, 25}, {9, 22}, {2, 29}, {13, 18}, {5, 26}, {10, 21}
            }
    );

    private static final Map<PlayoffRound, Integer> EXPECTED_TEAMS = Map.of(
            PlayoffRound.FINAL,          2,
            PlayoffRound.SEMI_FINALS,    4,
            PlayoffRound.QUARTER_FINALS, 8,
            PlayoffRound.ROUND_OF_16,    16,
            PlayoffRound.ROUND_OF_32,    32
    );

    @Transactional
    public void generateBracket(UUID seasonId, PlayoffRound startingRound, List<UUID> seededTeamIds, int numLegs) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new IllegalArgumentException("Season not found"));

        // If a bracket already exists for this season, clean it up first
        deleteBracket(seasonId);

        int expected = EXPECTED_TEAMS.getOrDefault(startingRound, -1);
        if (expected == -1) throw new IllegalArgumentException("Unsupported starting round: " + startingRound);
        if (seededTeamIds.size() != expected) {
            throw new IllegalArgumentException("Expected " + expected + " teams for " + startingRound + ", got " + seededTeamIds.size());
        }

        // Fetch teams in seed order
        List<Team> teams = new ArrayList<>();
        for (UUID teamId : seededTeamIds) {
            teams.add(teamRepository.findByIdAndTenantId(teamId, season.getTenantId())
                    .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId)));
        }

        // Build rounds top-down: FINAL → ... → startingRound
        // Each round's ties point nextTieId to the corresponding parent tie
        PlayoffTie finalTie = saveTie(season, PlayoffRound.FINAL, null, null, null);

        if (startingRound == PlayoffRound.FINAL) {
            assignSeedsAndMatches(finalTie, teams, SEEDING.get(PlayoffRound.FINAL), numLegs);
            return;
        }

        PlayoffTie semi1 = saveTie(season, PlayoffRound.SEMI_FINALS, null, null, finalTie);
        PlayoffTie semi2 = saveTie(season, PlayoffRound.SEMI_FINALS, null, null, finalTie);

        if (startingRound == PlayoffRound.SEMI_FINALS) {
            assignSeedsAndMatches(semi1, teams, new int[][]{{0, 3}}, numLegs);
            assignSeedsAndMatches(semi2, teams, new int[][]{{1, 2}}, numLegs);
            return;
        }

        PlayoffTie qf1 = saveTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi1);
        PlayoffTie qf2 = saveTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi1);
        PlayoffTie qf3 = saveTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi2);
        PlayoffTie qf4 = saveTie(season, PlayoffRound.QUARTER_FINALS, null, null, semi2);

        if (startingRound == PlayoffRound.QUARTER_FINALS) {
            assignSeedsAndMatches(qf1, teams, new int[][]{{0, 7}}, numLegs);
            assignSeedsAndMatches(qf2, teams, new int[][]{{3, 4}}, numLegs);
            assignSeedsAndMatches(qf3, teams, new int[][]{{1, 6}}, numLegs);
            assignSeedsAndMatches(qf4, teams, new int[][]{{2, 5}}, numLegs);
            return;
        }

        // ROUND_OF_16 ties
        PlayoffTie[] r16 = {
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf1),
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf1),
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf2),
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf2),
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf3),
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf3),
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf4),
            saveTie(season, PlayoffRound.ROUND_OF_16, null, null, qf4)
        };

        if (startingRound == PlayoffRound.ROUND_OF_16) {
            int[][] r16Seeds = SEEDING.get(PlayoffRound.ROUND_OF_16);
            for (int i = 0; i < 8; i++) {
                r16[i].setHomeSeedTeam(teams.get(r16Seeds[i][0]));
                r16[i].setAwaySeedTeam(teams.get(r16Seeds[i][1]));
                playoffTieRepository.save(r16[i]);
                createMatchesForTie(r16[i], numLegs);
            }
            return;
        }

        // ROUND_OF_32 (32 teams -> 16 ties pointing to r16)
        int[][] r32Seeds = SEEDING.get(PlayoffRound.ROUND_OF_32);
        for (int i = 0; i < 16; i++) {
            PlayoffTie parentR16 = r16[i / 2];
            PlayoffTie tie = saveTie(season, PlayoffRound.ROUND_OF_32, teams.get(r32Seeds[i][0]), teams.get(r32Seeds[i][1]), parentR16);
            createMatchesForTie(tie, numLegs);
        }
    }

    @Transactional
    public void resolveTie(UUID tieId) {
        PlayoffTie tie = playoffTieRepository.findById(tieId)
                .orElseThrow(() -> new ResourceNotFoundException("Tie not found: " + tieId));

        List<Match> matchLegs = matchRepository.findByPlayoffTieId(tieId);

        boolean allFinished = matchLegs.stream().allMatch(m -> m.getStatus() == Match.MatchStatus.FINISHED);
        if (!allFinished) return;

        Team winner = determineWinner(tie, matchLegs);
        tie.setAdvancingTeam(winner);
        playoffTieRepository.save(tie);

        if (tie.getNextTieId() != null) {
            playoffTieRepository.findById(tie.getNextTieId()).ifPresent(nextTie -> {
                List<PlayoffTie> siblingTies = playoffTieRepository.findByNextTieIdOrderByIdAsc(nextTie.getId());
                if (siblingTies != null && siblingTies.size() >= 2) {
                    if (siblingTies.get(0).getId().equals(tie.getId())) {
                        nextTie.setHomeSeedTeam(winner);
                    } else {
                        nextTie.setAwaySeedTeam(winner);
                    }
                } else {
                    // Fallback when siblings are not queried (e.g. unit mocks)
                    if (nextTie.getHomeSeedTeam() == null) {
                        nextTie.setHomeSeedTeam(winner);
                    } else if (nextTie.getAwaySeedTeam() == null || nextTie.getAwaySeedTeam().getId().equals(winner.getId())) {
                        nextTie.setAwaySeedTeam(winner);
                    }
                }

                if (nextTie.getHomeSeedTeam() != null && nextTie.getAwaySeedTeam() != null) {
                    List<Match> existingNextMatches = matchRepository.findByPlayoffTieId(nextTie.getId());
                    if (existingNextMatches == null || existingNextMatches.isEmpty()) {
                        createMatchesForTie(nextTie, matchLegs.size() > 0 ? matchLegs.size() : 1);
                    } else {
                        for (Match nm : existingNextMatches) {
                            nm.setHomeTeam(nextTie.getHomeSeedTeam());
                            nm.setAwayTeam(nextTie.getAwaySeedTeam());
                            matchRepository.save(nm);
                        }
                    }
                }
                playoffTieRepository.save(nextTie);
            });
        }
    }

    @Transactional
    public void deleteBracket(UUID seasonId) {
        List<PlayoffTie> ties = playoffTieRepository.findBySeasonId(seasonId);
        ties.forEach(tie -> tie.setNextTieId(null));
        playoffTieRepository.saveAll(ties);
        matchRepository.deleteBySeasonIdAndStage(seasonId, MatchStage.PLAYOFFS);
        playoffTieRepository.deleteBySeasonId(seasonId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private PlayoffTie saveTie(Season season, PlayoffRound round, Team home, Team away, PlayoffTie nextTie) {
        PlayoffTie tie = new PlayoffTie();
        tie.setSeason(season);
        tie.setTenantId(season.getTenantId());
        tie.setRound(round);
        tie.setHomeSeedTeam(home);
        tie.setAwaySeedTeam(away);
        if (nextTie != null) {
            tie.setNextTieId(nextTie.getId());
        }
        return playoffTieRepository.save(tie);
    }

    /** Assigns seeded teams and creates matches for a single tie using the given [home, away] seed index. */
    private void assignSeedsAndMatches(PlayoffTie tie, List<Team> teams, int[][] matchups, int numLegs) {
        tie.setHomeSeedTeam(teams.get(matchups[0][0]));
        tie.setAwaySeedTeam(teams.get(matchups[0][1]));
        createMatchesForTie(tie, numLegs);
        playoffTieRepository.save(tie);
    }

    private void createMatchesForTie(PlayoffTie tie, int numLegs) {
        if (tie.getHomeSeedTeam() == null || tie.getAwaySeedTeam() == null) return;

        for (int i = 1; i <= numLegs; i++) {
            Match match = new Match();
            match.setSeason(tie.getSeason());
            match.setTenantId(tie.getSeason().getTenantId());
            match.setStage(MatchStage.PLAYOFFS);
            match.setPlayoffTie(tie);
            match.setLegNumber(i);
            // Reverse home/away for the second leg
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

    private Team determineWinner(PlayoffTie tie, List<Match> matchLegs) {
        Team team1 = tie.getHomeSeedTeam();
        Team team2 = tie.getAwaySeedTeam();
        int score1 = 0;
        int score2 = 0;

        for (Match m : matchLegs) {
            if (m.getHomeTeam().getId().equals(team1.getId())) {
                score1 += m.getHomeScore() != null ? m.getHomeScore() : 0;
                score2 += m.getAwayScore() != null ? m.getAwayScore() : 0;
            } else {
                score2 += m.getHomeScore() != null ? m.getHomeScore() : 0;
                score1 += m.getAwayScore() != null ? m.getAwayScore() : 0;
            }
        }

        if (score1 > score2) return team1;
        if (score2 > score1) return team2;

        // In case of a draw, check if a penalty shootout was recorded
        for (Match m : matchLegs) {
            if (m.getPenaltyWinnerTeam() != null) {
                return m.getPenaltyWinnerTeam();
            }
            if (m.getHomePenaltyScore() != null && m.getAwayPenaltyScore() != null) {
                if (m.getHomePenaltyScore() > m.getAwayPenaltyScore()) {
                    return m.getHomeTeam();
                } else if (m.getAwayPenaltyScore() > m.getHomePenaltyScore()) {
                    return m.getAwayTeam();
                }
            }
        }

        // Simplified tiebreaker: higher seed (team1) wins on aggregate draw if no shootout
        return team1;
    }
}
