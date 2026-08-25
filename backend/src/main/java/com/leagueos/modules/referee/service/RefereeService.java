package com.leagueos.modules.referee.service;

import com.leagueos.modules.media.service.StorageService;
import com.leagueos.modules.referee.api.dto.CreateRefereeRequest;
import com.leagueos.modules.referee.api.dto.RefereeCreatedDTO;
import com.leagueos.modules.referee.api.dto.RefereeDTO;
import com.leagueos.modules.referee.api.dto.UpdateRefereeRequest;
import com.leagueos.modules.referee.domain.Referee;
import com.leagueos.modules.referee.persistence.RefereeRepository;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import com.leagueos.shared.security.Role;
import com.leagueos.shared.security.User;
import com.leagueos.shared.security.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RefereeService {

    private final RefereeRepository refereeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StorageService storageService;

    private static final String CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional(readOnly = true)
    public List<RefereeDTO> getAll(UUID tenantId) {
        return refereeRepository.findAllByOrderByNameAsc().stream()
                .filter(r -> r.getTenantId() != null && r.getTenantId().equals(tenantId))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RefereeDTO getById(UUID id, UUID tenantId) {
        Referee referee = refereeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Referee not found: " + id));
        return toDTO(referee);
    }

    @Transactional
    public RefereeCreatedDTO create(CreateRefereeRequest request, UUID tenantId) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del árbitro es requerido.");
        }

        Referee referee = new Referee();
        referee.setTenantId(tenantId);
        referee.setName(request.getName().trim());
        referee.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        referee = refereeRepository.save(referee);

        // Generar username único
        String baseSlug = StorageService.toSlug(referee.getName()).replace("-", "_");
        if (baseSlug.isBlank()) baseSlug = "arbitro";
        String username = "arbitro_" + baseSlug;
        int counter = 1;
        while (userRepository.findByUsername(username).isPresent()) {
            username = "arbitro_" + baseSlug + "_" + counter++;
        }

        // Generar contraseña temporal segura de 10 caracteres
        String tempPassword = generateRandomPassword(10);

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setRole(Role.ROLE_REFEREE);
        user.setTenantId(tenantId.toString());
        user.setName(referee.getName());
        user.setPhone(referee.getPhone());
        user.setRawPassword(tempPassword);
        user.setActive(true);
        user = userRepository.save(user);

        referee.setUserId(user.getId());
        referee.setRawPassword(tempPassword);
        referee = refereeRepository.save(referee);

        RefereeDTO baseDTO = toDTO(referee);
        return RefereeCreatedDTO.builder()
                .id(baseDTO.getId())
                .name(baseDTO.getName())
                .phone(baseDTO.getPhone())
                .photoUrl(baseDTO.getPhotoUrl())
                .signedPhotoUrl(baseDTO.getSignedPhotoUrl())
                .userId(baseDTO.getUserId())
                .username(username)
                .tempPassword(tempPassword)
                .rawPassword(tempPassword)
                .build();
    }

    @Transactional
    public RefereeDTO update(UUID id, UpdateRefereeRequest request, UUID tenantId) {
        Referee referee = refereeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Referee not found: " + id));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            referee.setName(request.getName().trim());
        }
        if (request.getPhone() != null) {
            referee.setPhone(request.getPhone().trim().isEmpty() ? null : request.getPhone().trim());
        }

        referee = refereeRepository.save(referee);
        return toDTO(referee);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Referee referee = refereeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Referee not found: " + id));

        if (referee.getPhotoUrl() != null) {
            storageService.deleteFile(referee.getPhotoUrl());
        }

        if (referee.getUserId() != null) {
            userRepository.deleteById(referee.getUserId());
        }

        refereeRepository.delete(referee);
    }

    @Transactional
    public RefereeDTO uploadPhoto(UUID id, byte[] imageBytes, String contentType, UUID tenantId) {
        Referee referee = refereeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Referee not found: " + id));

        String extension = ".jpg";
        if (contentType != null) {
            if (contentType.contains("png")) extension = ".png";
            else if (contentType.contains("webp")) extension = ".webp";
            else if (contentType.contains("jpeg") || contentType.contains("jpg")) extension = ".jpg";
        }

        String nameSlug = StorageService.toSlug(referee.getName());
        String shortId = UUID.randomUUID().toString().substring(0, 8);
        String filename = nameSlug + "_" + shortId + extension;
        String key = storageService.buildTenantKey(tenantId, "referees", filename);

        if (referee.getPhotoUrl() != null && referee.getPhotoUrl().contains("/referees/")) {
            storageService.deleteFile(referee.getPhotoUrl());
        }

        storageService.uploadFile(key, imageBytes, contentType != null ? contentType : "image/jpeg");
        referee.setPhotoUrl(key);
        referee = refereeRepository.save(referee);

        return toDTO(referee);
    }

    @Transactional
    public String resetPassword(UUID id, UUID tenantId) {
        Referee referee = refereeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Referee not found: " + id));

        String tempPassword = generateRandomPassword(10);
        referee.setRawPassword(tempPassword);

        if (referee.getUserId() != null) {
            Optional<User> userOpt = userRepository.findById(referee.getUserId());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setPassword(passwordEncoder.encode(tempPassword));
                userRepository.save(user);
                refereeRepository.save(referee);
                return tempPassword;
            }
        }

        // Si por alguna razón no tenía User, se lo creamos
        String baseSlug = StorageService.toSlug(referee.getName()).replace("-", "_");
        if (baseSlug.isBlank()) baseSlug = "arbitro";
        String username = "arbitro_" + baseSlug;
        int counter = 1;
        while (userRepository.findByUsername(username).isPresent()) {
            username = "arbitro_" + baseSlug + "_" + counter++;
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setRole(Role.ROLE_REFEREE);
        user.setTenantId(tenantId.toString());
        user = userRepository.save(user);

        referee.setUserId(user.getId());
        refereeRepository.save(referee);

        return tempPassword;
    }

    public RefereeDTO toDTO(Referee referee) {
        String username = null;
        if (referee.getUserId() != null) {
            username = userRepository.findById(referee.getUserId())
                    .map(User::getUsername)
                    .orElse(null);
        }

        String signedUrl = null;
        if (referee.getPhotoUrl() != null) {
            signedUrl = storageService.getSignedUrl(referee.getPhotoUrl(), 60);
        }

        return RefereeDTO.builder()
                .id(referee.getId())
                .name(referee.getName())
                .phone(referee.getPhone())
                .photoUrl(referee.getPhotoUrl())
                .signedPhotoUrl(signedUrl)
                .userId(referee.getUserId())
                .username(username)
                .rawPassword(referee.getRawPassword())
                .build();
    }

    private String generateRandomPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
        }
        return sb.toString();
    }
}
