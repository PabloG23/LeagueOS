package com.leagueos.modules.auth.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private String role;
    private UUID teamId;
    private String teamName;
    private String name;
    private String username;
    private UUID refereeId;
    private String tenantId;

    public AuthResponse(String accessToken, String role, UUID teamId, String tenantId) {
        this.accessToken = accessToken;
        this.role = role;
        this.teamId = teamId;
        this.tenantId = tenantId;
    }

    public AuthResponse(String accessToken, String role, UUID teamId, UUID refereeId, String tenantId) {
        this.accessToken = accessToken;
        this.role = role;
        this.teamId = teamId;
        this.refereeId = refereeId;
        this.tenantId = tenantId;
    }
}
