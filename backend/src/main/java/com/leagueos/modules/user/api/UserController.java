package com.leagueos.modules.user.api;

import com.leagueos.modules.user.api.dto.CreateAdminRequest;
import com.leagueos.modules.user.api.dto.UserDTO;
import com.leagueos.modules.user.service.UserService;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(
            @RequestHeader("X-Tenant-ID") UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(userService.getAllUsers(tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/admins")
    public ResponseEntity<UserDTO> createAdmin(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @Valid @RequestBody CreateAdminRequest request) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            UserDTO created = userService.createAdminUser(request, tenantId);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } finally {
            TenantContext.clear();
        }
    }

    @PatchMapping("/{userId}/toggle-status")
    public ResponseEntity<Map<String, Object>> toggleStatus(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            boolean active = userService.toggleUserActive(userId, currentUser.getId(), tenantId);
            return ResponseEntity.ok(Map.of("userId", userId, "isActive", active));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID userId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            String newPassword = userService.resetUserPassword(userId, tenantId);
            return ResponseEntity.ok(Map.of("tempPassword", newPassword));
        } finally {
            TenantContext.clear();
        }
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            userService.deleteUser(userId, currentUser.getId(), tenantId);
            return ResponseEntity.noContent().build();
        } finally {
            TenantContext.clear();
        }
    }
}
