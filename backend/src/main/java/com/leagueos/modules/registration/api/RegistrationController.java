package com.leagueos.modules.registration.api;

import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import com.leagueos.modules.registration.api.dto.PlayerResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/registration")
@RequiredArgsConstructor
public class RegistrationController {

    private final PlayerRegistrationService registrationService;

    @PostMapping("/players")
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_TEAM_REP')")
    public PlayerResponse registerPlayer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader(value = "X-Tenant-ID", required = false) UUID headerTenantId,
            @RequestBody com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest request) {
        UUID tenantId = (userDetails != null && userDetails.getTenantId() != null)
                ? UUID.fromString(userDetails.getTenantId())
                : (headerTenantId != null ? headerTenantId : TenantContext.getCurrentTenant());
        TenantContext.setCurrentTenant(tenantId);
        try {
            UUID effectiveTeamId;
            if (userDetails != null && !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LEAGUE_ADMIN"))) {
                effectiveTeamId = userDetails.getTeamId();
            } else {
                effectiveTeamId = request.getTeamId();
            }
            return registrationService.registerPlayer(request, effectiveTeamId, tenantId);
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
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
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
