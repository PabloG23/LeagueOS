package com.leagueos.modules.user.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateAdminRequest {
    @NotBlank(message = "El nombre del administrador es obligatorio")
    private String name;

    private String phone;

    private String username;

    private String password;
}
