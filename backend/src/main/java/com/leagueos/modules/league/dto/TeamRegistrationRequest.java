package com.leagueos.modules.league.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class TeamRegistrationRequest {

    @NotBlank(message = "El nombre del equipo es obligatorio")
    private String teamName;

    @NotBlank(message = "El nombre del representante es obligatorio")
    private String representativeName;

    @NotBlank(message = "El teléfono del representante es obligatorio")
    private String representativePhone;

    private String logoUrl;

    @NotNull(message = "El ID del torneo (Season) es obligatorio")
    private UUID seasonId;
}
