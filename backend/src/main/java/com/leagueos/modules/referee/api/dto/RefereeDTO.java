package com.leagueos.modules.referee.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RefereeDTO {
    private UUID id;
    private String name;
    private String phone;
    private String photoUrl;
    private String signedPhotoUrl;
    private UUID userId;
    private String username;
    private String rawPassword;
}
