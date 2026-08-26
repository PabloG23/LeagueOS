package com.leagueos.modules.user.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.leagueos.shared.security.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private UUID id;
    private String username;
    private String name;
    private String phone;
    private Role role;
    private String tenantId;
    private UUID teamId;
    private String teamName;
    private String teamLogoUrl;
    private String signedTeamLogoUrl;
    private UUID refereeId;
    private String photoUrl;
    private String signedPhotoUrl;
    private String rawPassword;

    @JsonProperty("isActive")
    private boolean isActive;

    private LocalDateTime createdAt;
}
