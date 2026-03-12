package com.leagueos.modules.registration.api.dto;

import lombok.Data;
import java.util.UUID;
import java.time.LocalDate;

@Data
public class BatchPlayerRegistrationRequest {
    private String firstName;
    private String lastName;
    private Integer jerseyNumber;
    private LocalDate birthDate;
}
