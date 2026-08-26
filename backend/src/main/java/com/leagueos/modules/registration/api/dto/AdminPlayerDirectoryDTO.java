package com.leagueos.modules.registration.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPlayerDirectoryDTO {
    private UUID id;
    private UUID personId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String curp;
    private LocalDate birthDate;
    private Integer jerseyNumber;
    private String profilePhotoUrl;
    private String signedPhotoUrl;
    private String status; // ACTIVE, INACTIVE, PENDING_VERIFICATION

    @JsonProperty("isActive")
    private boolean isActive;

    // Team Info
    private UUID teamId;
    private String teamName;
    private String teamLogoUrl;
    private String signedTeamLogoUrl;

    // Aggregated Stats
    private int matchesPlayed;
    private int goals;
    private int yellowCards;
    private int redCards;
    private Integer suspendedUntilMatchday;
}
