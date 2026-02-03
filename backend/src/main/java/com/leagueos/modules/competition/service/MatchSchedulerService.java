package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MatchSchedulerService {

    private final MatchRepository matchRepository;

    @Transactional
    public Match scheduleMatch(Match match) {
        return matchRepository.save(match);
    }

    @Transactional(readOnly = true)
    public List<Match> getMatchesBySeason(UUID seasonId) {
        return matchRepository.findBySeasonId(seasonId);
    }

    @Transactional
    public Match recordResult(UUID matchId, int homeScore, int awayScore) {
        Match match = matchRepository.findById(matchId)
            .orElseThrow(() -> new RuntimeException("Match not found"));
        match.setHomeScore(homeScore);
        match.setAwayScore(awayScore);
        match.setStatus(Match.MatchStatus.FINISHED);
        return matchRepository.save(match);
    }
}
