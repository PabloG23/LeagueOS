package com.leagueos.modules.registration.api;

import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.shared.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public ResponseEntity<List<PlayerResponse>> getMyTeamPlayers(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails.getTeamId() == null) {
            return ResponseEntity.badRequest().build();
        }
        List<PlayerResponse> players = playerRegistrationService.getPlayersByTeam(userDetails.getTeamId());
        // Sort active first logic could be here or frontend. Frontend already does it.
        return ResponseEntity.ok(players);
    }

    @PostMapping("/players")
    public ResponseEntity<PlayerResponse> registerPlayer(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                 @RequestBody com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest request) {
        if (userDetails.getTeamId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(playerRegistrationService.registerPlayer(request, userDetails.getTeamId(), UUID.fromString(userDetails.getTenantId())));
    }

    @PostMapping("/teams/{teamId}/players/batch")
    public ResponseEntity<List<PlayerResponse>> registerPlayersBatch(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                             @PathVariable UUID teamId,
                                                             @RequestBody List<com.leagueos.modules.registration.api.dto.BatchPlayerRegistrationRequest> requestList) {
        return ResponseEntity.ok(playerRegistrationService.registerPlayersBatch(requestList, teamId, UUID.fromString(userDetails.getTenantId())));
    }

    @PatchMapping("/players/{id}/activate")
    public ResponseEntity<Void> activatePlayer(@PathVariable UUID id) {
        playerRegistrationService.activatePlayer(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/players/{id}/deactivate")
    public ResponseEntity<Void> deactivatePlayer(@PathVariable UUID id) {
        playerRegistrationService.deactivatePlayer(id);
        return ResponseEntity.ok().build();
    }
}
