package com.leagueos.shared.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JwtTokenProvider — JWT Generation, Validation & Extraction")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    private static final String TEST_SECRET = "SecretKeyMustBeLongEnoughForHS512AlgorithmRequirementsPleaseChangeMe12345678901234567890";
    private static final long EXPIRATION_MS = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationDate", EXPIRATION_MS);
    }

    @Test
    @DisplayName("should generate valid token and extract username successfully")
    void generatesAndExtractsUsername() {
        String username = "admin_nd";
        String role = "ROLE_LEAGUE_ADMIN";
        String tenantId = UUID.randomUUID().toString();

        String token = jwtTokenProvider.generateToken(username, role, tenantId);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUsernameFromJWT(token)).isEqualTo(username);
    }

    @Test
    @DisplayName("validateToken should return false for malformed or invalid token")
    void validateTokenReturnsFalseForInvalid() {
        assertThat(jwtTokenProvider.validateToken("invalid.jwt.token")).isFalse();
        assertThat(jwtTokenProvider.validateToken(null)).isFalse();
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }
}
