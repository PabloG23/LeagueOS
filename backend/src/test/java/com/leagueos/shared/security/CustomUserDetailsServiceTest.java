package com.leagueos.shared.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CustomUserDetailsService — Spring Security User Details Loader")
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService userDetailsService;

    @Test
    @DisplayName("should load user and map to CustomUserDetails with tenant and team IDs")
    void loadsUserSuccessfully() {
        UUID userId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        String tenantId = UUID.randomUUID().toString();

        User user = new User();
        user.setId(userId);
        user.setUsername("admin_test");
        user.setPassword("encoded_password");
        user.setRole(Role.ROLE_LEAGUE_ADMIN);
        user.setTenantId(tenantId);
        user.setTeamId(teamId);
        user.setActive(true);

        when(userRepository.findByUsername("admin_test")).thenReturn(Optional.of(user));

        UserDetails userDetails = userDetailsService.loadUserByUsername("admin_test");

        assertThat(userDetails).isInstanceOf(CustomUserDetails.class);
        CustomUserDetails customDetails = (CustomUserDetails) userDetails;

        assertThat(customDetails.getUsername()).isEqualTo("admin_test");
        assertThat(customDetails.getPassword()).isEqualTo("encoded_password");
        assertThat(customDetails.getId()).isEqualTo(userId);
        assertThat(customDetails.getTenantId()).isEqualTo(tenantId);
        assertThat(customDetails.getTeamId()).isEqualTo(teamId);
        assertThat(customDetails.isEnabled()).isTrue();
        assertThat(customDetails.getAuthorities()).extracting("authority")
                .containsExactly("ROLE_LEAGUE_ADMIN");
    }

    @Test
    @DisplayName("should throw UsernameNotFoundException when user is not found")
    void throwsWhenUserNotFound() {
        when(userRepository.findByUsername("non_existent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("non_existent"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("User not found with username: non_existent");
    }
}
