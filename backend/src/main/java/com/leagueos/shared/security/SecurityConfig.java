package com.leagueos.shared.security;

import com.leagueos.shared.infrastructure.filter.TenantContextFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.config.Customizer;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final TenantContextFilter tenantContextFilter;
    private final com.leagueos.shared.infrastructure.filter.RateLimitingFilter rateLimitingFilter;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> {
                headers.frameOptions(frame -> frame.deny());
                headers.contentTypeOptions(Customizer.withDefaults());
                headers.xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK));
                headers.referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
                headers.permissionsPolicy(permissions -> permissions.policy("microphone=(), payment=(), usb=(), camera=(self)"));
                headers.httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                );
            })
            .authorizeHttpRequests(auth -> auth
                // 1. Auth and errors
                .requestMatchers("/api/auth/**", "/error").permitAll()
                
                // 2. Public read-only endpoints (Public portal, statistics, schedules, brackets)
                .requestMatchers(HttpMethod.GET,
                    "/api/public/**",
                    "/public/**",
                    "/api/tenants/settings/**",
                    "/api/leagues/tenants",
                    "/api/leagues/teams",
                    "/api/leagues/seasons",
                    "/api/leagues/seasons/*/teams",
                    "/api/leagues/seasons/*/playoffs/bracket",
                    "/api/leagues/seasons/*/preview-fixtures/round-robin",
                    "/api/leagues/fields",
                    "/api/registration/teams/*/players",
                    "/api/competition/seasons/*/matches",
                    "/api/matches/**",
                    "/api/templates/**",
                    "/api/media/proxy",
                    "/api/media/signed-url"
                ).permitAll()

                // 3. Public registration of teams if allowed
                .requestMatchers(HttpMethod.POST, "/api/public/teams/register").permitAll()

                // 4. Everything else (state-changing endpoints, admin panels, player management) requires authentication
                .anyRequest().authenticated()
            )
            // Rate limiting runs first to protect auth and expensive OCR endpoints
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            // JWT filter runs second so authentication is established before tenant resolution
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(tenantContextFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*", "https://*.vercel.app", "https://*.nuestrodeporte.com", "https://nuestrodeporte.com"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*", "X-Tenant-ID", "Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
