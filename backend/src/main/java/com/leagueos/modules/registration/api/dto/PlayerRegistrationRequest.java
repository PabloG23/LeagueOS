package com.leagueos.modules.registration.api.dto;

import lombok.Data;
import java.util.UUID;
import java.time.LocalDate;

@Data
public class PlayerRegistrationRequest {
    private String firstName;
    private String lastName;
    private LocalDate birthDate;
    private String profilePhotoUrl;
    private UUID teamId;
}
