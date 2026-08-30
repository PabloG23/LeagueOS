package com.leagueos.modules.referee.api;

import com.leagueos.modules.referee.api.dto.CreateRefereeRequest;
import com.leagueos.modules.referee.api.dto.RefereeCreatedDTO;
import com.leagueos.modules.referee.api.dto.RefereeDTO;
import com.leagueos.modules.referee.api.dto.RefereeMatchDTO;
import com.leagueos.modules.referee.api.dto.UpdateRefereeRequest;
import com.leagueos.modules.referee.service.MatchReportPhotoService;
import com.leagueos.modules.referee.service.RefereeService;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.security.CustomUserDetails;
import com.leagueos.shared.util.FileValidationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class RefereeController {

    private final RefereeService refereeService;
    private final MatchReportPhotoService matchReportPhotoService;

    // ==========================================
    // ADMIN ENDPOINTS (ROLE_LEAGUE_ADMIN)
    // ==========================================

    @GetMapping("/api/referees")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<List<RefereeDTO>> getAllReferees(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        UUID tenantId = UUID.fromString(currentUser.getTenantId());
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(refereeService.getAll(tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/api/referees/{id}")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<RefereeDTO> getRefereeById(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable UUID id) {
        UUID tenantId = UUID.fromString(currentUser.getTenantId());
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(refereeService.getById(id, tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/api/referees")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<RefereeCreatedDTO> createReferee(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestBody CreateRefereeRequest request) {
        UUID tenantId = UUID.fromString(currentUser.getTenantId());
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(refereeService.create(request, tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @PutMapping("/api/referees/{id}")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<RefereeDTO> updateReferee(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable UUID id,
            @RequestBody UpdateRefereeRequest request) {
        UUID tenantId = UUID.fromString(currentUser.getTenantId());
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(refereeService.update(id, request, tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @DeleteMapping("/api/referees/{id}")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<Void> deleteReferee(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable UUID id) {
        UUID tenantId = UUID.fromString(currentUser.getTenantId());
        TenantContext.setCurrentTenant(tenantId);
        try {
            refereeService.delete(id, tenantId);
            return ResponseEntity.noContent().build();
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/api/referees/{id}/photo")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<RefereeDTO> uploadRefereePhoto(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) throws IOException {
        FileValidationUtils.validateImageFile(file);
        UUID tenantId = UUID.fromString(currentUser.getTenantId());
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(refereeService.uploadPhoto(id, file.getBytes(), file.getContentType(), tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/api/referees/{id}/reset-password")
    @PreAuthorize("hasRole('ROLE_LEAGUE_ADMIN')")
    public ResponseEntity<Map<String, String>> resetRefereePassword(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable UUID id) {
        UUID tenantId = UUID.fromString(currentUser.getTenantId());
        TenantContext.setCurrentTenant(tenantId);
        try {
            String tempPassword = refereeService.resetPassword(id, tenantId);
            return ResponseEntity.ok(Collections.singletonMap("tempPassword", tempPassword));
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/api/referees/match-report/{matchId}/download-url")
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_REFEREE')")
    public ResponseEntity<Map<String, String>> getMatchReportDownloadUrl(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID matchId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            String signedUrl = matchReportPhotoService.getMatchReportSignedUrl(matchId, tenantId);
            return ResponseEntity.ok(Collections.singletonMap("signedUrl", signedUrl));
        } finally {
            TenantContext.clear();
        }
    }

    // ==========================================
    // REFEREE PORTAL ENDPOINTS (ROLE_REFEREE)
    // ==========================================

    @GetMapping("/api/referee/my-matches")
    @PreAuthorize("hasRole('ROLE_REFEREE')")
    public ResponseEntity<List<RefereeMatchDTO>> getMyMatches(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(matchReportPhotoService.getMyMatches(userDetails.getId(), tenantId));
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/api/referee/matches/{matchId}/report-photo")
    @PreAuthorize("hasRole('ROLE_REFEREE')")
    public ResponseEntity<RefereeMatchDTO> uploadMatchReportPhoto(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @PathVariable UUID matchId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws IOException {
        FileValidationUtils.validateImageFile(file);
        TenantContext.setCurrentTenant(tenantId);
        try {
            return ResponseEntity.ok(matchReportPhotoService.uploadMatchReportPhoto(
                    matchId,
                    userDetails.getId(),
                    file.getBytes(),
                    file.getContentType(),
                    tenantId
            ));
        } finally {
            TenantContext.clear();
        }
    }
}
