package com.leagueos.modules.league.api;

import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.dto.TeamRegistrationRequest;
import com.leagueos.modules.league.service.TeamRegistrationService;
import com.leagueos.shared.context.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/public/teams")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TeamRegistrationController {

    private final TeamRegistrationService teamRegistrationService;

    @PostMapping("/register")
    public ResponseEntity<TeamRegistration> registerTeam(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody @Valid TeamRegistrationRequest request) {
        
        TenantContext.setCurrentTenant(tenantId);
        try {
            TeamRegistration registration = teamRegistrationService.registerTeam(request, tenantId);
            return ResponseEntity.ok(registration);
        } finally {
            TenantContext.clear();
        }
    }
}
