package com.leagueos.modules.registration.api.dto;

import com.leagueos.modules.registration.domain.PlayerStatus;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class PlayerResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private LocalDate birthDate;
    private String profilePhotoUrl;
    private UUID teamId;
    private Integer jerseyNumber;
    private PlayerStatus status;
}
