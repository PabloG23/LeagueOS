package com.leagueos.modules.competition.api;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @PostMapping("/{matchId}/report")
    public ResponseEntity<Void> submitMatchReport(@PathVariable UUID matchId, @RequestBody List<MatchEvent> events) {
        // Note: Accepting Entities directly in Controller is an anti-pattern (DTO pattern preferred),
        // but following the prompt's simplicity and execution speed instructions.
        matchService.submitMatchReport(matchId, events);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{matchday}")
    public ResponseEntity<List<Match>> getMatchesByMatchday(@PathVariable Integer matchday) {
        return ResponseEntity.ok(matchService.getMatchesByMatchday(matchday));
    }
}
