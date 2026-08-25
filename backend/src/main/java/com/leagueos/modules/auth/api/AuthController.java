package com.leagueos.modules.auth.api;

import com.leagueos.modules.auth.api.dto.AuthRequest;
import com.leagueos.modules.auth.api.dto.AuthResponse;
import com.leagueos.shared.security.JwtTokenProvider;
import com.leagueos.shared.security.User;
import com.leagueos.shared.security.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final com.leagueos.modules.referee.persistence.RefereeRepository refereeRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("Credenciales Inválidas");
        }

        if (!user.isActive()) {
            return ResponseEntity.status(403).body("Tu cuenta de usuario ha sido desactivada por el administrador.");
        }

        String token = tokenProvider.generateToken(
                user.getUsername(),
                user.getRole().name(),
                user.getTenantId()
        );

        java.util.UUID refereeId = null;
        if (user.getRole() == com.leagueos.shared.security.Role.ROLE_REFEREE) {
            refereeId = refereeRepository.findByUserId(user.getId())
                    .map(com.leagueos.modules.referee.domain.Referee::getId)
                    .orElse(null);
        }

        return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(), user.getTeamId(), refereeId, user.getTenantId()));
    }
}
