package com.leagueos.modules.registration.api;

import com.leagueos.modules.media.service.StorageService;
import com.leagueos.modules.registration.api.dto.PlayerRegistrationRequest;
import com.leagueos.modules.registration.api.dto.PlayerResponse;
import com.leagueos.modules.registration.service.IneExtractionResult;
import com.leagueos.modules.registration.service.IneExtractionService;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.shared.context.TenantContext;
import com.leagueos.shared.domain.exception.BusinessRuleException;
import com.leagueos.shared.security.CustomUserDetails;
import com.leagueos.shared.util.FileValidationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/players")
@RequiredArgsConstructor
public class PlayerVerificationController {

    private final IneExtractionService ineExtractionService;
    private final StorageService storageService;
    private final PlayerRegistrationService playerRegistrationService;
    private final com.leagueos.modules.league.persistence.TeamRepository teamRepository;
    private final com.leagueos.modules.registration.persistence.SeasonRosterRepository seasonRosterRepository;

    private UUID resolveAndValidateTeamId(CustomUserDetails userDetails, UUID requestedTeamId) {
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LEAGUE_ADMIN"))) {
            return requestedTeamId;
        }
        if (userDetails.getTeamId() == null) {
            throw new BusinessRuleException("El usuario representante no tiene un equipo asignado.");
        }
        if (requestedTeamId != null && !requestedTeamId.equals(userDetails.getTeamId())) {
            throw new BusinessRuleException("No tienes permisos para registrar jugadores en otro equipo.");
        }
        return userDetails.getTeamId();
    }

    private void validatePlayerAccess(CustomUserDetails userDetails, UUID playerId) {
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_LEAGUE_ADMIN"))) {
            return;
        }
        if (userDetails.getTeamId() == null) {
            throw new BusinessRuleException("Acceso no autorizado.");
        }
        boolean belongsToTeam = seasonRosterRepository.findByPlayerId(playerId).stream()
                .anyMatch(roster -> roster.getTeam() != null && roster.getTeam().getId().equals(userDetails.getTeamId()));
        if (!belongsToTeam) {
            throw new BusinessRuleException("No tienes permisos para verificar jugadores de otro equipo.");
        }
    }

    private String resolveTeamName(UUID teamId, UUID playerId) {
        if (teamId != null) {
            return teamRepository.findById(teamId).map(com.leagueos.modules.league.domain.Team::getName).orElse("general");
        }
        if (playerId != null) {
            return seasonRosterRepository.findByPlayerId(playerId).stream()
                    .findFirst()
                    .map(roster -> roster.getTeam() != null ? roster.getTeam().getName() : "general")
                    .orElse("general");
        }
        return "general";
    }

    private String getFileExtension(MultipartFile file, String defaultExt) {
        if (file != null && file.getContentType() != null) {
            String ct = file.getContentType().toLowerCase();
            if (ct.contains("png")) return ".png";
            if (ct.contains("webp")) return ".webp";
            if (ct.contains("jpeg") || ct.contains("jpg")) return ".jpg";
        }
        return defaultExt;
    }

    /**
     * Registers a new Mexican player via INE scan.
     * The backend extracts data AND crops the face using Gemini — no face_crop needed from the client.
     */
    @PostMapping(value = "/verify-ine", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_TEAM_REP')")
    public ResponseEntity<PlayerResponse> verifyAndRegisterMexican(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("ine_image") MultipartFile ineImage,
            @RequestParam(value = "team_id", required = false) UUID teamId,
            @RequestParam(value = "jersey_number", required = false) Integer jerseyNumber) throws Exception {

        FileValidationUtils.validateImageFile(ineImage);
        UUID effectiveTeamId = resolveAndValidateTeamId(userDetails, teamId);
        UUID tenantId = UUID.fromString(userDetails.getTenantId());
        log.info("Starting verify-ine for tenant: {}, team: {}", tenantId, effectiveTeamId);

        // 1. Extract data AND face crop using Gemini
        log.info("Calling Gemini OCR for INE image (size: {} bytes)...", ineImage.getSize());
        IneExtractionResult extractedData = ineExtractionService.extractDataFromIne(
                ineImage.getBytes(), ineImage.getContentType());

        byte[] faceBytes = extractedData.getCroppedFaceBytes();
        if (faceBytes == null || faceBytes.length == 0) {
            throw new BusinessRuleException("No se pudo extraer el rostro del INE. Intenta con una foto más clara.");
        }

        // 2. Prepare request and pre-validate business rules BEFORE uploading to R2
        PlayerRegistrationRequest request = new PlayerRegistrationRequest();
        request.setFirstName(extractedData.getNombre());

        String lastName = extractedData.getApellidoPaterno();
        if (extractedData.getApellidoMaterno() != null) {
            lastName += " " + extractedData.getApellidoMaterno();
        }
        request.setLastName(lastName);
        request.setBirthDate(extractedData.getFechaNacimiento());
        request.setCurp(extractedData.getCurp());
        request.setTeamId(effectiveTeamId);
        request.setJerseyNumber(jerseyNumber);
        request.setIsForeign(false);

        playerRegistrationService.validateRegistrationPreconditions(request, effectiveTeamId, tenantId);

        // 3. Upload server-cropped face to R2
        String teamName = resolveTeamName(effectiveTeamId, null);
        String fullName = (extractedData.getNombre() + " " + (extractedData.getApellidoPaterno() != null ? extractedData.getApellidoPaterno() : "") + " " + (extractedData.getApellidoMaterno() != null ? extractedData.getApellidoMaterno() : "")).trim();
        String faceFilename = storageService.buildPlayerKey(tenantId, teamName, fullName, ".jpg");
        storageService.uploadFile(faceFilename, faceBytes, "image/jpeg");
        request.setProfilePhotoUrl(faceFilename);

        try {
            PlayerResponse response = playerRegistrationService.registerPlayer(request, effectiveTeamId, tenantId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.warn("Registration failed after upload, deleting orphaned file from R2: {}", faceFilename);
            storageService.deleteFile(faceFilename);
            throw e;
        }
    }

    /**
     * Verifies an existing PENDING_VERIFICATION player via INE scan.
     */
    @PostMapping(value = "/{id}/verify-ine", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_TEAM_REP')")
    public ResponseEntity<PlayerResponse> verifyExistingMexican(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id,
            @RequestParam("ine_image") MultipartFile ineImage,
            @RequestParam(value = "jersey_number", required = false) Integer jerseyNumber) throws Exception {

        FileValidationUtils.validateImageFile(ineImage);
        validatePlayerAccess(userDetails, id);
        UUID tenantId = UUID.fromString(userDetails.getTenantId());

        IneExtractionResult extractedData = ineExtractionService.extractDataFromIne(
                ineImage.getBytes(), ineImage.getContentType());

        byte[] faceBytes = extractedData.getCroppedFaceBytes();
        if (faceBytes == null || faceBytes.length == 0) {
            throw new BusinessRuleException("No se pudo extraer el rostro del INE. Intenta con una foto más clara.");
        }

        PlayerRegistrationRequest request = new PlayerRegistrationRequest();
        request.setFirstName(extractedData.getNombre());

        String lastName = extractedData.getApellidoPaterno();
        if (extractedData.getApellidoMaterno() != null) {
            lastName += " " + extractedData.getApellidoMaterno();
        }
        request.setLastName(lastName);
        request.setBirthDate(extractedData.getFechaNacimiento());
        request.setCurp(extractedData.getCurp());
        request.setJerseyNumber(jerseyNumber);

        // Pre-validate before uploading to R2
        playerRegistrationService.validateVerificationPreconditions(id, request, tenantId);

        String teamName = resolveTeamName(null, id);
        String fullName = (extractedData.getNombre() + " " + (extractedData.getApellidoPaterno() != null ? extractedData.getApellidoPaterno() : "") + " " + (extractedData.getApellidoMaterno() != null ? extractedData.getApellidoMaterno() : "")).trim();
        String faceFilename = storageService.buildPlayerKey(tenantId, teamName, fullName, ".jpg");
        storageService.uploadFile(faceFilename, faceBytes, "image/jpeg");
        request.setProfilePhotoUrl(faceFilename);

        try {
            PlayerResponse response = playerRegistrationService.verifyPlayer(id, request, tenantId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            storageService.deleteFile(faceFilename);
            throw e;
        }
    }

    /**
     * Registers a foreign player (no INE, no CURP). The client sends the face photo directly.
     */
    @PostMapping(value = "/register-foreign", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_TEAM_REP')")
    public ResponseEntity<PlayerResponse> registerForeign(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("first_name") String firstName,
            @RequestParam(value = "last_name", required = false) String lastName,
            @RequestParam(value = "birth_date", required = false) String birthDateStr,
            @RequestParam(value = "team_id", required = false) UUID teamId,
            @RequestParam(value = "jersey_number", required = false) Integer jerseyNumber,
            @RequestParam(value = "curp", required = false) String curp,
            @RequestParam("face_crop") MultipartFile faceCrop) throws Exception {

        FileValidationUtils.validateImageFile(faceCrop);
        UUID effectiveTeamId = resolveAndValidateTeamId(userDetails, teamId);
        UUID tenantId = UUID.fromString(userDetails.getTenantId());

        // 1. Prepare request and pre-validate business rules BEFORE uploading to R2
        PlayerRegistrationRequest request = new PlayerRegistrationRequest();
        request.setFirstName(firstName);
        request.setLastName(lastName);
        if (birthDateStr != null && !birthDateStr.isEmpty()) {
            request.setBirthDate(LocalDate.parse(birthDateStr));
        }
        if (curp != null && !curp.trim().isEmpty()) {
            request.setCurp(curp.trim().toUpperCase());
        }
        request.setTeamId(effectiveTeamId);
        request.setJerseyNumber(jerseyNumber);
        request.setIsForeign(true);

        playerRegistrationService.validateRegistrationPreconditions(request, effectiveTeamId, tenantId);

        // 2. Upload photo to R2
        String teamName = resolveTeamName(effectiveTeamId, null);
        String fullName = (firstName + " " + (lastName != null ? lastName : "")).trim();
        String ext = getFileExtension(faceCrop, ".webp");
        String faceFilename = storageService.buildPlayerKey(tenantId, teamName, fullName, ext);
        storageService.uploadFile(faceFilename, faceCrop.getBytes(), faceCrop.getContentType());
        request.setProfilePhotoUrl(faceFilename);

        try {
            PlayerResponse response = playerRegistrationService.registerPlayer(request, effectiveTeamId, tenantId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.warn("Foreign registration failed after upload, deleting orphaned file from R2: {}", faceFilename);
            storageService.deleteFile(faceFilename);
            throw e;
        }
    }

    /**
     * Verifies an existing PENDING_VERIFICATION player as a foreign player (uploads face crop directly).
     */
    @PostMapping(value = "/{id}/verify-foreign", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ROLE_LEAGUE_ADMIN', 'ROLE_TEAM_REP')")
    public ResponseEntity<PlayerResponse> verifyExistingForeign(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id,
            @RequestParam("first_name") String firstName,
            @RequestParam(value = "last_name", required = false) String lastName,
            @RequestParam(value = "birth_date", required = false) String birthDateStr,
            @RequestParam(value = "jersey_number", required = false) Integer jerseyNumber,
            @RequestParam(value = "curp", required = false) String curp,
            @RequestParam("face_crop") MultipartFile faceCrop) throws Exception {

        FileValidationUtils.validateImageFile(faceCrop);
        validatePlayerAccess(userDetails, id);
        UUID tenantId = UUID.fromString(userDetails.getTenantId());

        PlayerRegistrationRequest request = new PlayerRegistrationRequest();
        request.setFirstName(firstName);
        request.setLastName(lastName);
        if (birthDateStr != null && !birthDateStr.isEmpty()) {
            request.setBirthDate(LocalDate.parse(birthDateStr));
        }
        if (curp != null && !curp.trim().isEmpty()) {
            request.setCurp(curp.trim().toUpperCase());
        }
        request.setJerseyNumber(jerseyNumber);
        request.setIsForeign(true);

        // Pre-validate before uploading to R2
        playerRegistrationService.validateVerificationPreconditions(id, request, tenantId);

        String teamName = resolveTeamName(null, id);
        String fullName = (firstName + " " + (lastName != null ? lastName : "")).trim();
        String ext = getFileExtension(faceCrop, ".webp");
        String faceFilename = storageService.buildPlayerKey(tenantId, teamName, fullName, ext);
        storageService.uploadFile(faceFilename, faceCrop.getBytes(), faceCrop.getContentType());
        request.setProfilePhotoUrl(faceFilename);

        try {
            PlayerResponse response = playerRegistrationService.verifyPlayer(id, request, tenantId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.warn("Foreign verification failed after upload, deleting orphaned file from R2: {}", faceFilename);
            storageService.deleteFile(faceFilename);
            throw e;
        }
    }
}
