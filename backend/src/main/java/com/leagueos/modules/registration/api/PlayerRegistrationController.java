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

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PlayerRegistrationController {

    private final PlayerRegistrationService playerRegistrationService;

    @GetMapping("/my-team/players")
    public ResponseEntity<List<Player>> getMyTeamPlayers(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails.getTeamId() == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Player> players = playerRegistrationService.getPlayersByTeam(userDetails.getTeamId());
        // Sort active first logic could be here or frontend. Frontend already does it.
        return ResponseEntity.ok(players);
    }

    @PostMapping("/players")
    public ResponseEntity<Player> registerPlayer(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                 @RequestBody com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest request) {
        if (userDetails.getTeamId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(playerRegistrationService.registerPlayer(request, userDetails.getTeamId(), UUID.fromString(userDetails.getTenantId())));
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
