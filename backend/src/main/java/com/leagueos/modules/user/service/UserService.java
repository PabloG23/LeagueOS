package com.leagueos.modules.user.service;

import com.leagueos.modules.league.domain.Person;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.referee.domain.Referee;
import com.leagueos.modules.referee.persistence.RefereeRepository;
import com.leagueos.modules.user.api.dto.CreateAdminRequest;
import com.leagueos.modules.user.api.dto.UserDTO;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import com.leagueos.modules.media.service.StorageService;
import com.leagueos.shared.security.Role;
import com.leagueos.shared.security.User;
import com.leagueos.shared.security.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefereeRepository refereeRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;
    private final StorageService storageService;

    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers(UUID tenantId) {
        String tenantStr = tenantId.toString();
        List<User> users = userRepository.findByTenantIdOrderByCreatedAtDesc(tenantStr);

        // Preload referees and teams for mapping
        List<Referee> referees = refereeRepository.findByTenantIdOrderByNameAsc(tenantId);
        Map<UUID, Referee> refereeByUserMap = referees.stream()
                .filter(r -> r.getUserId() != null)
                .collect(Collectors.toMap(Referee::getUserId, r -> r, (r1, r2) -> r1));

        List<Team> teams = teamRepository.findByTenantIdOrderByNameAsc(tenantId);
        Map<UUID, Team> teamMap = teams.stream()
                .collect(Collectors.toMap(Team::getId, t -> t, (t1, t2) -> t1));

        return users.stream().map(user -> {
            String rawPass = user.getRawPassword();

            if (user.getRole() == Role.ROLE_REFEREE) {
                Referee ref = refereeByUserMap.get(user.getId());
                if (ref != null) {
                    if ((rawPass == null || rawPass.isBlank()) && ref.getRawPassword() != null && !ref.getRawPassword().isBlank()) {
                        rawPass = ref.getRawPassword();
                        user.setRawPassword(rawPass);
                        userRepository.save(user);
                    } else if (rawPass != null && !rawPass.isBlank() && (ref.getRawPassword() == null || ref.getRawPassword().isBlank())) {
                        ref.setRawPassword(rawPass);
                        refereeRepository.save(ref);
                    }
                }
            }

            // If still null or blank, auto-generate fallback and sync
            if (rawPass == null || rawPass.isBlank()) {
                rawPass = generateRandomPassword(10);
                user.setRawPassword(rawPass);
                user.setPassword(passwordEncoder.encode(rawPass));
                userRepository.save(user);
                if (user.getRole() == Role.ROLE_REFEREE) {
                    Referee ref = refereeByUserMap.get(user.getId());
                    if (ref != null) {
                        ref.setRawPassword(rawPass);
                        refereeRepository.save(ref);
                    }
                }
            }

            UserDTO.UserDTOBuilder builder = UserDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .name(user.getName())
                    .phone(user.getPhone())
                    .role(user.getRole())
                    .tenantId(user.getTenantId())
                    .rawPassword(rawPass)
                    .isActive(user.isActive())
                    .createdAt(user.getCreatedAt());

            if (user.getRole() == Role.ROLE_REFEREE) {
                Referee ref = refereeByUserMap.get(user.getId());
                if (ref != null) {
                    builder.refereeId(ref.getId());
                    if (user.getName() == null || user.getName().isBlank()) {
                        builder.name(ref.getName());
                    }
                    if (user.getPhone() == null || user.getPhone().isBlank()) {
                        builder.phone(ref.getPhone());
                    }
                    builder.photoUrl(ref.getPhotoUrl());
                    if (ref.getPhotoUrl() != null && !ref.getPhotoUrl().startsWith("http")) {
                        builder.signedPhotoUrl(storageService.getSignedUrl(ref.getPhotoUrl(), 120));
                    } else {
                        builder.signedPhotoUrl(ref.getPhotoUrl());
                    }
                }
            } else if (user.getRole() == Role.ROLE_TEAM_REP) {
                if (user.getTeamId() != null) {
                    builder.teamId(user.getTeamId());
                    Team team = teamMap.get(user.getTeamId());
                    if (team != null) {
                        builder.teamName(team.getName());
                        builder.teamLogoUrl(team.getLogoUrl());
                        if (team.getLogoUrl() != null && !team.getLogoUrl().startsWith("http")) {
                            builder.signedTeamLogoUrl(storageService.getSignedUrl(team.getLogoUrl(), 120));
                        } else {
                            builder.signedTeamLogoUrl(team.getLogoUrl());
                        }
                    }
                }
            }

            return builder.build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public UserDTO createAdminUser(CreateAdminRequest req, UUID tenantId) {
        String name = req.getName().trim();
        String phone = req.getPhone() != null ? req.getPhone().trim() : null;

        String username = req.getUsername() != null && !req.getUsername().trim().isEmpty()
                ? req.getUsername().trim().toLowerCase()
                : generateUniqueUsername("admin_" + StorageService.toSlug(name));

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("El nombre de usuario @" + username + " ya existe en la plataforma.");
        }

        String rawPassword = req.getPassword() != null && !req.getPassword().trim().isEmpty()
                ? req.getPassword().trim()
                : generateRandomPassword(10);

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(Role.ROLE_LEAGUE_ADMIN);
        user.setTenantId(tenantId.toString());
        user.setName(name);
        user.setPhone(phone);
        user.setRawPassword(rawPassword);
        user.setActive(true);

        User saved = userRepository.save(user);

        return UserDTO.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .name(saved.getName())
                .phone(saved.getPhone())
                .role(saved.getRole())
                .tenantId(saved.getTenantId())
                .rawPassword(saved.getRawPassword())
                .isActive(saved.isActive())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional
    public User createOrUpdateTeamRepUser(Team team, Person rep, UUID tenantId) {
        if (team == null || rep == null) return null;

        String repFullName = (rep.getFirstName() + " " + (rep.getLastName() != null ? rep.getLastName() : "")).trim();
        String repPhone = rep.getPhone();

        // Check if a user already exists for this team
        Optional<User> existingUserOpt = userRepository.findByTeamId(team.getId());
        if (existingUserOpt.isEmpty() && rep.getId() != null) {
            existingUserOpt = userRepository.findByPersonId(rep.getId());
        }

        if (existingUserOpt.isPresent()) {
            User existing = existingUserOpt.get();
            existing.setName(repFullName);
            existing.setPhone(repPhone);
            existing.setTeamId(team.getId());
            existing.setPersonId(rep.getId());
            return userRepository.save(existing);
        }

        // Generate unique username based on team name or rep name
        String baseSlug = "rep_" + StorageService.toSlug(team.getName());
        String username = generateUniqueUsername(baseSlug);
        String rawPassword = generateRandomPassword(10);

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPassword(passwordEncoder.encode(rawPassword));
        newUser.setRole(Role.ROLE_TEAM_REP);
        newUser.setTenantId(tenantId.toString());
        newUser.setTeamId(team.getId());
        newUser.setPersonId(rep.getId());
        newUser.setName(repFullName);
        newUser.setPhone(repPhone);
        newUser.setRawPassword(rawPassword);
        newUser.setActive(true);

        return userRepository.save(newUser);
    }

    @Transactional
    public boolean toggleUserActive(UUID userId, UUID currentUserId, UUID tenantId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + userId));

        if (!user.getTenantId().equals(tenantId.toString())) {
            throw new IllegalArgumentException("No autorizado para modificar usuarios de otra liga.");
        }

        if (userId.equals(currentUserId)) {
            throw new IllegalArgumentException("No puedes desactivar tu propia cuenta de administrador.");
        }

        user.setActive(!user.isActive());
        userRepository.save(user);
        return user.isActive();
    }

    @Transactional
    public String resetUserPassword(UUID userId, UUID tenantId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + userId));

        if (!user.getTenantId().equals(tenantId.toString())) {
            throw new IllegalArgumentException("No autorizado para modificar usuarios de otra liga.");
        }

        String newPassword = generateRandomPassword(10);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setRawPassword(newPassword);
        userRepository.save(user);

        // If referee, sync raw_password in referees table as well
        if (user.getRole() == Role.ROLE_REFEREE) {
            refereeRepository.findByUserId(userId).ifPresent(ref -> {
                ref.setRawPassword(newPassword);
                refereeRepository.save(ref);
            });
        }

        return newPassword;
    }

    @Transactional
    public void deleteUser(UUID userId, UUID currentUserId, UUID tenantId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + userId));

        if (!user.getTenantId().equals(tenantId.toString())) {
            throw new IllegalArgumentException("No autorizado para eliminar usuarios de otra liga.");
        }

        if (userId.equals(currentUserId)) {
            throw new IllegalArgumentException("No puedes eliminar tu propia cuenta de administrador.");
        }

        // If referee, unlink user
        refereeRepository.findByUserId(userId).ifPresent(ref -> {
            ref.setUserId(null);
            refereeRepository.save(ref);
        });

        userRepository.delete(user);
    }

    private String generateUniqueUsername(String base) {
        String cleanBase = base.replaceAll("[^a-z0-9_]", "_");
        String candidate = cleanBase;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = cleanBase + "_" + suffix;
            suffix++;
        }
        return candidate;
    }

    public static String generateRandomPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
        }
        return sb.toString();
    }
}
