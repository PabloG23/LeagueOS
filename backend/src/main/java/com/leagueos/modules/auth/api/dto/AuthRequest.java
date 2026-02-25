package com.leagueos.modules.auth.api.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String username;
    private String password;
}
