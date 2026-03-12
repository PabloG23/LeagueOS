package com.leagueos.modules.competition.api;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchEvent;
import com.leagueos.modules.competition.service.MatchService;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MatchController {

    private final MatchService matchService;

    @PostMapping("/{matchId}/report")
    public ResponseEntity<Void> submitMatchReport(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID matchId, 
            @RequestBody List<MatchEvent> events) {
        
        TenantContext.setCurrentTenant(tenantId);
        try {
            matchService.submitMatchReport(matchId, events);
            return ResponseEntity.ok().build();
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/{matchId}/report")
    public ResponseEntity<List<MatchEvent>> getMatchReport(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID matchId) {
        
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(matchService.getMatchEvents(matchId));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/{matchday}")
    public ResponseEntity<List<Match>> getMatchesByMatchday(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable Integer matchday) {
        
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(matchService.getMatchesByMatchday(matchday));
        } finally {
            TenantContext.clear();
        }
    }

    @PutMapping("/{matchId}/schedule")
    public ResponseEntity<Match> updateMatchSchedule(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID matchId,
            @RequestBody com.leagueos.modules.competition.api.dto.UpdateMatchScheduleRequest request) {
        
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(matchService.updateMatchSchedule(matchId, request));
        } finally {
            TenantContext.clear();
        }
    }
}
