package com.leagueos.modules.user.service;

import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.referee.domain.Referee;
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

        @Test
        @DisplayName("toggleUserActive should reject self-deactivation and cross-tenant access")
        void toggleUserActiveValidations() {
            UUID adminId = UUID.randomUUID();
            User user = new User();
            user.setId(adminId);
            user.setTenantId(TENANT_A.toString());

            when(userRepository.findById(adminId)).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> userService.toggleUserActive(adminId, adminId, TENANT_A))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No puedes desactivar tu propia cuenta");

            assertThatThrownBy(() -> userService.toggleUserActive(adminId, UUID.randomUUID(), TENANT_B))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No autorizado para modificar usuarios de otra liga");
        }

        @Test
        @DisplayName("resetUserPassword should update password and sync referee raw_password when user is referee")
        void resetsUserPasswordAndSyncsReferee() {
            UUID userId = UUID.randomUUID();
            User user = new User();
            user.setId(userId);
            user.setTenantId(TENANT_A.toString());
            user.setRole(Role.ROLE_REFEREE);

            Referee ref = new Referee();
            ref.setId(UUID.randomUUID());
            ref.setUserId(userId);

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(refereeRepository.findByUserId(userId)).thenReturn(Optional.of(ref));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            String newPass = userService.resetUserPassword(userId, TENANT_A);

            assertThat(newPass).hasSize(10);
            assertThat(ref.getRawPassword()).isEqualTo(newPass);
            verify(refereeRepository).save(ref);
        }

        @Test
        @DisplayName("deleteUser should unlink user from referee before deleting")
        void deletesUserAndUnlinksReferee() {
            UUID userId = UUID.randomUUID();
            UUID adminId = UUID.randomUUID();
            User user = new User();
            user.setId(userId);
            user.setTenantId(TENANT_A.toString());

            Referee ref = new Referee();
            ref.setUserId(userId);

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(refereeRepository.findByUserId(userId)).thenReturn(Optional.of(ref));

            userService.deleteUser(userId, adminId, TENANT_A);

            assertThat(ref.getUserId()).isNull();
            verify(refereeRepository).save(ref);
            verify(userRepository).delete(user);
        }

        @Test
        @DisplayName("createOrUpdateTeamRepUser should update existing user when found by teamId")
        void updatesExistingRepUser() {
            com.leagueos.modules.league.domain.Team team = new com.leagueos.modules.league.domain.Team();
            team.setId(UUID.randomUUID());
            team.setName("Chivas");

            com.leagueos.modules.league.domain.Person rep = new com.leagueos.modules.league.domain.Person();
            rep.setId(UUID.randomUUID());
            rep.setFirstName("Fernando");
            rep.setLastName("Hierro");
            rep.setPhone("3312345678");

            User existingUser = new User();
            existingUser.setId(UUID.randomUUID());
            existingUser.setUsername("rep_chivas");

            when(userRepository.findByTeamId(team.getId())).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            User updated = userService.createOrUpdateTeamRepUser(team, rep, TENANT_A);

            assertThat(updated.getName()).isEqualTo("Fernando Hierro");
            assertThat(updated.getPhone()).isEqualTo("3312345678");
            assertThat(updated.getTeamId()).isEqualTo(team.getId());
        }

        @Test
        @DisplayName("createOrUpdateTeamRepUser should return null when team or rep is null")
        void returnsNullWhenTeamOrRepNull() {
            assertThat(userService.createOrUpdateTeamRepUser(null, new com.leagueos.modules.league.domain.Person(), TENANT_A)).isNull();
            assertThat(userService.createOrUpdateTeamRepUser(new com.leagueos.modules.league.domain.Team(), null, TENANT_A)).isNull();
        }

        @Test
        @DisplayName("createAdminUser should throw IllegalArgumentException when username already exists")
        void throwsWhenUsernameExists() {
            CreateAdminRequest req = new CreateAdminRequest();
            req.setName("Admin Existente");
            req.setUsername("admin_nd");

            when(userRepository.existsByUsername("admin_nd")).thenReturn(true);

            assertThatThrownBy(() -> userService.createAdminUser(req, TENANT_A))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("ya existe en la plataforma");
        }

        @Test
        @DisplayName("getAllUsers should map referee and team rep details including signed URLs and passwords")
        void mapsRefereeAndTeamRepUsers() {
            UUID refereeUserId = UUID.randomUUID();
            UUID refereeId = UUID.randomUUID();
            User refUser = new User();
            refUser.setId(refereeUserId);
            refUser.setUsername("arbitro_paco");
            refUser.setRole(Role.ROLE_REFEREE);
            refUser.setTenantId(TENANT_A.toString());
            refUser.setActive(true);

            Referee ref = new Referee();
            ref.setId(refereeId);
            ref.setUserId(refereeUserId);
            ref.setName("Paco Chacón");
            ref.setPhone("4421234567");
            ref.setPhotoUrl("tenant/referees/paco.jpg");
            ref.setRawPassword("RefPass123");

            UUID teamId = UUID.randomUUID();
            User repUser = new User();
            repUser.setId(UUID.randomUUID());
            repUser.setUsername("rep_pumas");
            repUser.setRole(Role.ROLE_TEAM_REP);
            repUser.setTenantId(TENANT_A.toString());
            repUser.setTeamId(teamId);
            repUser.setRawPassword(null); // Triggers password generation!
            repUser.setActive(true);

            com.leagueos.modules.league.domain.Team team = new com.leagueos.modules.league.domain.Team();
            team.setId(teamId);
            team.setName("Pumas UNAM");
            team.setLogoUrl("http://external.com/pumas.png"); // HTTP url!

            when(userRepository.findByTenantIdOrderByCreatedAtDesc(TENANT_A.toString()))
                    .thenReturn(List.of(refUser, repUser));
            when(refereeRepository.findByTenantIdOrderByNameAsc(TENANT_A)).thenReturn(List.of(ref));
            when(teamRepository.findByTenantIdOrderByNameAsc(TENANT_A)).thenReturn(List.of(team));
            when(storageService.getSignedUrl("tenant/referees/paco.jpg", 120)).thenReturn("https://signed.com/paco.jpg");

            List<UserDTO> results = userService.getAllUsers(TENANT_A);

            assertThat(results).hasSize(2);

            UserDTO refDTO = results.get(0);
            assertThat(refDTO.getRefereeId()).isEqualTo(refereeId);
            assertThat(refDTO.getName()).isEqualTo("Paco Chacón");
            assertThat(refDTO.getPhone()).isEqualTo("4421234567");
            assertThat(refDTO.getSignedPhotoUrl()).isEqualTo("https://signed.com/paco.jpg");
            assertThat(refDTO.getRawPassword()).isEqualTo("RefPass123");

            UserDTO repDTO = results.get(1);
            assertThat(repDTO.getTeamName()).isEqualTo("Pumas UNAM");
            assertThat(repDTO.getSignedTeamLogoUrl()).isEqualTo("http://external.com/pumas.png");
            assertThat(repDTO.getRawPassword()).isNotBlank();
        }
    }
}
