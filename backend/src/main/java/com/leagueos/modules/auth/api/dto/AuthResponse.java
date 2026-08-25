package com.leagueos.modules.auth.api.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private String role;
    private java.util.UUID teamId;
    private java.util.UUID refereeId;
    private String tenantId;

    public AuthResponse(String accessToken, String role, java.util.UUID teamId, String tenantId) {
        this.accessToken = accessToken;
        this.role = role;
        this.teamId = teamId;
        this.tenantId = tenantId;
    }

    public AuthResponse(String accessToken, String role, java.util.UUID teamId, java.util.UUID refereeId, String tenantId) {
        this.accessToken = accessToken;
        this.role = role;
        this.teamId = teamId;
        this.refereeId = refereeId;
        this.tenantId = tenantId;
    }
}
