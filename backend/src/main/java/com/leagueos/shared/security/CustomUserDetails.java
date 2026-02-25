package com.leagueos.shared.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;
import java.util.UUID;

@Getter
public class CustomUserDetails extends User {

    private final UUID id;
    private final String tenantId;
    private final UUID teamId;

    public CustomUserDetails(String username, String password, Collection<? extends GrantedAuthority> authorities,
                             UUID id, String tenantId, UUID teamId) {
        super(username, password, authorities);
        this.id = id;
        this.tenantId = tenantId;
        this.teamId = teamId;
    }
}
