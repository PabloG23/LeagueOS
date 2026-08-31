package com.leagueos.modules.user.service;

import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.referee.persistence.RefereeRepository;
import com.leagueos.modules.user.api.dto.CreateAdminRequest;
import com.leagueos.modules.user.api.dto.UserDTO;
import com.leagueos.modules.media.service.StorageService;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import com.leagueos.shared.security.Role;
import com.leagueos.shared.security.User;
import com.leagueos.shared.security.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService — User Management & Tenant Isolation")
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefereeRepository refereeRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private StorageService storageService;

    @InjectMocks
    private UserService userService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @BeforeEach
    void setUp() {
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");
    }

    // =========================================================================
    // getAllUsers — Tenant-Scoped
    // =========================================================================

    @Nested
    @DisplayName("getAllUsers")
    class GetAllUsers {

        @Test
        @DisplayName("should query users by tenant ID only")
        void queriesUsersForTenantOnly() {
            User user = new User();
            user.setId(UUID.randomUUID());
            user.setUsername("admin_nd");
            user.setRole(Role.ROLE_LEAGUE_ADMIN);
            user.setTenantId(TENANT_A.toString());
            user.setActive(true);

            when(userRepository.findByTenantIdOrderByCreatedAtDesc(TENANT_A.toString()))
                    .thenReturn(List.of(user));
            when(refereeRepository.findByTenantIdOrderByNameAsc(TENANT_A)).thenReturn(Collections.emptyList());
            when(teamRepository.findByTenantIdOrderByNameAsc(TENANT_A)).thenReturn(Collections.emptyList());

            List<UserDTO> results = userService.getAllUsers(TENANT_A);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getUsername()).isEqualTo("admin_nd");
            assertThat(results.get(0).getTenantId()).isEqualTo(TENANT_A.toString());

            verify(userRepository).findByTenantIdOrderByCreatedAtDesc(TENANT_A.toString());
            verify(userRepository, never()).findByTenantIdOrderByCreatedAtDesc(TENANT_B.toString());
        }
    }

    // =========================================================================
    // createAdminUser
    // =========================================================================

    @Nested
    @DisplayName("createAdminUser")
    class CreateAdminUser {

        @Test
        @DisplayName("should create admin user with encoded password and tenant ID")
        void createsAdminUserSuccessfully() {
            CreateAdminRequest request = new CreateAdminRequest();
            request.setName("Admin Liga");
            request.setUsername("admin_liga");
            request.setPassword("Secret123!");
            request.setPhone("7221234567");

            when(userRepository.existsByUsername("admin_liga")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(UUID.randomUUID());
                return u;
            });

            UserDTO result = userService.createAdminUser(request, TENANT_A);

            assertThat(result).isNotNull();
            assertThat(result.getUsername()).isEqualTo("admin_liga");
            assertThat(result.getRole()).isEqualTo(Role.ROLE_LEAGUE_ADMIN);
            assertThat(result.getTenantId()).isEqualTo(TENANT_A.toString());
            assertThat(result.isActive()).isTrue();

            verify(passwordEncoder).encode("Secret123!");
            verify(userRepository).save(argThat(u ->
                    u.getUsername().equals("admin_liga") &&
                    u.getTenantId().equals(TENANT_A.toString()) &&
                    u.getRole() == Role.ROLE_LEAGUE_ADMIN
            ));
        }

        @Test
        @DisplayName("should reject creation if username is already taken")
        void rejectsDuplicateUsername() {
            CreateAdminRequest request = new CreateAdminRequest();
            request.setName("Admin Duplicado");
            request.setUsername("admin_existente");

            when(userRepository.existsByUsername("admin_existente")).thenReturn(true);

            assertThatThrownBy(() -> userService.createAdminUser(request, TENANT_A))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("ya existe en la plataforma");

            verify(userRepository, never()).save(any());
        }
    }

    // =========================================================================
    // resetUserPassword & deleteUser — Tenant Isolation
    // =========================================================================

    @Nested
    @DisplayName("resetUserPassword and deleteUser — Tenant Isolation")
    class PasswordAndDeletionIsolation {

        @Test
        @DisplayName("ISOLATION: should reject password reset if user belongs to a different tenant")
        void rejectsPasswordResetForDifferentTenant() {
            UUID userId = UUID.randomUUID();
            User user = new User();
            user.setId(userId);
            user.setTenantId(TENANT_A.toString()); // Belongs to Tenant A

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // Attempting reset with Tenant B!
            assertThatThrownBy(() -> userService.resetUserPassword(userId, TENANT_B))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No autorizado para modificar usuarios de otra liga");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ISOLATION: should reject deletion if user belongs to a different tenant")
        void rejectsDeleteForDifferentTenant() {
            UUID userId = UUID.randomUUID();
            UUID currentAdminId = UUID.randomUUID();
            User user = new User();
            user.setId(userId);
            user.setTenantId(TENANT_A.toString());

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // Attempting delete with Tenant B!
            assertThatThrownBy(() -> userService.deleteUser(userId, currentAdminId, TENANT_B))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No autorizado para eliminar usuarios de otra liga");

            verify(userRepository, never()).delete(any());
        }

        @Test
        @DisplayName("should reject self-deletion for admin account")
        void rejectsSelfDeletion() {
            UUID adminId = UUID.randomUUID();
            User admin = new User();
            admin.setId(adminId);
            admin.setTenantId(TENANT_A.toString());

            when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

            assertThatThrownBy(() -> userService.deleteUser(adminId, adminId, TENANT_A))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No puedes eliminar tu propia cuenta de administrador");

            verify(userRepository, never()).delete(any());
        }
    }

    // =========================================================================
    // createOrUpdateTeamRepUser & toggleUserStatus
    // =========================================================================

    @Nested
    @DisplayName("createOrUpdateTeamRepUser and toggleUserStatus")
    class RepUserAndToggle {

        @Test
        @DisplayName("createOrUpdateTeamRepUser should create new user when none exists")
        void createsNewRepUser() {
            com.leagueos.modules.league.domain.Team team = new com.leagueos.modules.league.domain.Team();
            team.setId(UUID.randomUUID());
            team.setName("Tigres UANL");

            com.leagueos.modules.league.domain.Person rep = new com.leagueos.modules.league.domain.Person();
            rep.setId(UUID.randomUUID());
            rep.setFirstName("Mauricio");
            rep.setLastName("Culebro");
            rep.setPhone("8112345678");

            when(userRepository.findByTeamId(team.getId())).thenReturn(Optional.empty());
            when(userRepository.findByPersonId(rep.getId())).thenReturn(Optional.empty());
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            User created = userService.createOrUpdateTeamRepUser(team, rep, TENANT_A);

            assertThat(created).isNotNull();
            assertThat(created.getName()).isEqualTo("Mauricio Culebro");
            assertThat(created.getRole()).isEqualTo(Role.ROLE_TEAM_REP);
            assertThat(created.getTenantId()).isEqualTo(TENANT_A.toString());
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("toggleUserActive should toggle user active flag")
        void togglesUserActive() {
            UUID userId = UUID.randomUUID();
            UUID currentAdminId = UUID.randomUUID();
            User user = new User();
            user.setId(userId);
            user.setTenantId(TENANT_A.toString());
            user.setActive(true);

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            boolean status = userService.toggleUserActive(userId, currentAdminId, TENANT_A);

            assertThat(status).isFalse();
            assertThat(user.isActive()).isFalse();
        }
    }
}
