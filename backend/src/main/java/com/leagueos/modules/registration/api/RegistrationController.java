package com.leagueos.modules.registration.api;

import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/registration")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RegistrationController {

    private final PlayerRegistrationService registrationService;

    @PostMapping("/players")
    public Player registerPlayer(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody Player player) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            player.setTenantId(tenantId);
            return registrationService.registerPlayer(player);
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/teams/{teamId}/players")
    public List<Player> getTeamPlayers(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID teamId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return registrationService.getPlayersByTeam(teamId);
        } finally {
            TenantContext.clear();
        }
    }
}
