package com.leagueos.modules.registration.api;

import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.shared.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import com.leagueos.modules.registration.api.dto.PlayerResponse;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PlayerRegistrationController {

    private final PlayerRegistrationService playerRegistrationService;

    @GetMapping("/my-team/players")
    @PreAuthorize("hasRole('ROLE_TEAM_REP')")
    public ResponseEntity<List<PlayerResponse>> getMyTeamPlayers(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails.getTeamId() == null) {
            return ResponseEntity.badRequest().build();
        }
        List<PlayerResponse> players = playerRegistrationService.getPlayersByTeam(userDetails.getTeamId());
        // Sort active first logic could be here or frontend. Frontend already does it.
        return ResponseEntity.ok(players);
    }

    @PostMapping("/players")
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_TEAM_REP')")
    public ResponseEntity<PlayerResponse> registerPlayer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest request) {
        
        UUID effectiveTeamId;
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LEAGUE_ADMIN"))) {
            effectiveTeamId = request.getTeamId();
        } else {
            if (userDetails.getTeamId() == null) {
                return ResponseEntity.badRequest().build();
            }
            effectiveTeamId = userDetails.getTeamId();
        }
        
        UUID tenantId = UUID.fromString(userDetails.getTenantId());
        return ResponseEntity.ok(playerRegistrationService.registerPlayer(request, effectiveTeamId, tenantId));
    }

    @PostMapping("/teams/{teamId}/players/batch")
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_TEAM_REP')")
    public ResponseEntity<List<PlayerResponse>> registerPlayersBatch(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID teamId,
            @RequestBody List<com.leagueos.modules.registration.api.dto.BatchPlayerRegistrationRequest> requestList) {
        
        if (!userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LEAGUE_ADMIN"))) {
            if (userDetails.getTeamId() == null || !userDetails.getTeamId().equals(teamId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        
        UUID tenantId = UUID.fromString(userDetails.getTenantId());
        return ResponseEntity.ok(playerRegistrationService.registerPlayersBatch(requestList, teamId, tenantId));
    }

    @PatchMapping("/players/{id}/activate")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<Void> activatePlayer(@PathVariable UUID id) {
        playerRegistrationService.activatePlayer(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/players/{id}/deactivate")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<Void> deactivatePlayer(@PathVariable UUID id) {
        playerRegistrationService.deactivatePlayer(id);
        return ResponseEntity.ok().build();
    }
}
