package com.leagueos.modules.registration.api;

import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import com.leagueos.modules.registration.api.dto.PlayerResponse;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/registration")
@RequiredArgsConstructor
public class RegistrationController {

    private final PlayerRegistrationService registrationService;

    @PostMapping("/players")
    public PlayerResponse registerPlayer(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest request) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return registrationService.registerPlayer(request, null, tenantId);
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/teams/{teamId}/players")
    public List<PlayerResponse> getTeamPlayers(
            @RequestHeader(value = "X-Tenant-ID", required = false) UUID tenantId,
            @PathVariable UUID teamId) {
        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }
        try {
            return registrationService.getPlayersByTeam(teamId);
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/players/directory")
    public List<com.leagueos.modules.registration.api.dto.AdminPlayerDirectoryDTO> getPlayersDirectory(
            @RequestHeader(value = "X-Tenant-ID", required = false) UUID tenantId) {
        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }
        try {
            return registrationService.getPlayersDirectory(tenantId);
        } finally {
            TenantContext.clear();
        }
    }
}
