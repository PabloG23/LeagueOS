package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchSchedulerService — Scheduling, Retrieval and Score Recording")
class MatchSchedulerServiceTest {

    @Mock private MatchRepository matchRepository;

    @InjectMocks
    private MatchSchedulerService matchSchedulerService;

    @Test
    @DisplayName("scheduleMatch should save and return match")
    void schedulesMatch() {
        Match match = new Match();
        match.setId(UUID.randomUUID());
        when(matchRepository.save(match)).thenReturn(match);

        Match result = matchSchedulerService.scheduleMatch(match);

        assertThat(result).isEqualTo(match);
        verify(matchRepository).save(match);
    }

    @Test
    @DisplayName("getMatchesBySeason should return matches for season")
    void getsMatchesBySeason() {
        UUID seasonId = UUID.randomUUID();
        Match match = new Match();
        when(matchRepository.findBySeasonId(seasonId)).thenReturn(List.of(match));

        List<Match> results = matchSchedulerService.getMatchesBySeason(seasonId);

        assertThat(results).hasSize(1);
        assertThat(results.get(0)).isEqualTo(match);
    }

    @Test
    @DisplayName("recordResult should update scores and set status to FINISHED")
    void recordsResultSuccessfully() {
        UUID matchId = UUID.randomUUID();
        Match match = new Match();
        match.setId(matchId);
        match.setStatus(Match.MatchStatus.SCHEDULED);

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

        Match result = matchSchedulerService.recordResult(matchId, 3, 2);

        assertThat(result.getHomeScore()).isEqualTo(3);
        assertThat(result.getAwayScore()).isEqualTo(2);
        assertThat(result.getStatus()).isEqualTo(Match.MatchStatus.FINISHED);
    }

    @Test
    @DisplayName("recordResult should throw ResourceNotFoundException when match is not found")
    void throwsWhenMatchNotFound() {
        UUID matchId = UUID.randomUUID();
        when(matchRepository.findById(matchId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> matchSchedulerService.recordResult(matchId, 1, 0))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Match not found");
    }
}
