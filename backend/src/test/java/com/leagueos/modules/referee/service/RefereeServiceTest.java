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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefereeService — Referee Management & Tenant Isolation")
class RefereeServiceTest {

    @Mock private RefereeRepository refereeRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private StorageService storageService;

    @InjectMocks
    private RefereeService refereeService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private UUID refereeId;
    private Referee referee;

    @BeforeEach
    void setUp() {
        refereeId = UUID.randomUUID();
        referee = new Referee();
        referee.setId(refereeId);
        referee.setName("Armando Archundia");
        referee.setPhone("7229876543");
        referee.setTenantId(TENANT_A);
    }

    // =========================================================================
    // getAll & getById
    // =========================================================================

    @Nested
    @DisplayName("getAll and getById — Tenant Scoping")
    class GetReferees {

        @Test
        @DisplayName("getAll should filter referees by tenant ID")
        void getAllFiltersByTenant() {
            Referee otherTenantRef = new Referee();
            otherTenantRef.setId(UUID.randomUUID());
            otherTenantRef.setName("Marco Rodríguez");
            otherTenantRef.setTenantId(TENANT_B);

            when(refereeRepository.findAllByOrderByNameAsc()).thenReturn(List.of(referee, otherTenantRef));

            List<RefereeDTO> results = refereeService.getAll(TENANT_A);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getName()).isEqualTo("Armando Archundia");
        }

        @Test
        @DisplayName("getById should return referee for matching tenant")
        void getByIdReturnsReferee() {
            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.of(referee));

            RefereeDTO dto = refereeService.getById(refereeId, TENANT_A);

            assertThat(dto.getId()).isEqualTo(refereeId);
            assertThat(dto.getName()).isEqualTo("Armando Archundia");
        }

        @Test
        @DisplayName("getById should throw ResourceNotFoundException when not found or in different tenant")
        void getByIdThrowsWhenNotFound() {
            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_B)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> refereeService.getById(refereeId, TENANT_B))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Referee not found");
        }
    }

    // =========================================================================
    // create
    // =========================================================================

    @Nested
    @DisplayName("create")
    class CreateReferee {

        @Test
        @DisplayName("should create referee and linked User with ROLE_REFEREE and temp password")
        void createsRefereeAndUserSuccessfully() {
            CreateRefereeRequest request = new CreateRefereeRequest();
            request.setName("Fernando Guerrero");
            request.setPhone("7221112233");

            when(refereeRepository.save(any(Referee.class))).thenAnswer(inv -> {
                Referee r = inv.getArgument(0);
                if (r.getId() == null) r.setId(UUID.randomUUID());
                return r;
            });
            when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
            when(passwordEncoder.encode(anyString())).thenReturn("encoded_pass");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(UUID.randomUUID());
                return u;
            });

            RefereeCreatedDTO result = refereeService.create(request, TENANT_A);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Fernando Guerrero");
            assertThat(result.getUsername()).startsWith("arbitro_");
            assertThat(result.getTempPassword()).isNotBlank();

            // Verify User was saved with Role ROLE_REFEREE and TENANT_A
            verify(userRepository).save(argThat(u ->
                    u.getRole() == Role.ROLE_REFEREE &&
                    u.getTenantId().equals(TENANT_A.toString()) &&
                    u.isActive()
            ));
        }

        @Test
        @DisplayName("should reject creation if referee name is blank")
        void throwsWhenNameIsBlank() {
            CreateRefereeRequest request = new CreateRefereeRequest();
            request.setName("   ");

            assertThatThrownBy(() -> refereeService.create(request, TENANT_A))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("El nombre del árbitro es requerido");
        }
    }

    // =========================================================================
    // update & delete
    // =========================================================================

    @Nested
    @DisplayName("update and delete")
    class UpdateAndDelete {

        @Test
        @DisplayName("update should modify referee details")
        void updatesReferee() {
            UpdateRefereeRequest request = new UpdateRefereeRequest();
            request.setName("Armando Archundia Modificado");
            request.setPhone("7220000000");

            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.of(referee));
            when(refereeRepository.save(any(Referee.class))).thenAnswer(inv -> inv.getArgument(0));

            RefereeDTO result = refereeService.update(refereeId, request, TENANT_A);

            assertThat(result.getName()).isEqualTo("Armando Archundia Modificado");
            assertThat(result.getPhone()).isEqualTo("7220000000");
        }

        @Test
        @DisplayName("delete should remove referee, delete user, and clean up photo file")
        void deletesRefereeWithCleanup() {
            UUID userId = UUID.randomUUID();
            referee.setUserId(userId);
            referee.setPhotoUrl("tenants/123/referees/photo.jpg");

            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.of(referee));

            refereeService.delete(refereeId, TENANT_A);

            verify(storageService).deleteFile("tenants/123/referees/photo.jpg");
            verify(userRepository).deleteById(userId);
            verify(refereeRepository).delete(referee);
        }
    }

    // =========================================================================
    // uploadPhoto & resetPassword
    // =========================================================================

    @Nested
    @DisplayName("uploadPhoto and resetPassword")
    class PhotoAndReset {

        @Test
        @DisplayName("uploadPhoto should upload file with tenant key and update referee photoUrl")
        void uploadsPhotoSuccessfully() {
            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.of(referee));
            when(storageService.buildTenantKey(eq(TENANT_A), eq("referees"), anyString()))
                    .thenReturn("tenants/" + TENANT_A + "/referees/armando_123.jpg");
            when(refereeRepository.save(any(Referee.class))).thenAnswer(inv -> inv.getArgument(0));
            when(storageService.getSignedUrl(anyString(), anyInt())).thenReturn("https://signed.com/ref.jpg");

            byte[] bytes = new byte[]{1, 2, 3};
            RefereeDTO result = refereeService.uploadPhoto(refereeId, bytes, "image/webp", TENANT_A);

            assertThat(result.getPhotoUrl()).contains("armando");
            assertThat(result.getSignedPhotoUrl()).isEqualTo("https://signed.com/ref.jpg");
            verify(storageService).uploadFile(anyString(), eq(bytes), eq("image/webp"));
        }

        @Test
        @DisplayName("resetPassword should update raw_password and encoded password on user")
        void resetsPasswordSuccessfully() {
            UUID userId = UUID.randomUUID();
            referee.setUserId(userId);

            User user = new User();
            user.setId(userId);

            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.of(referee));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.encode(anyString())).thenReturn("new_hash");

            String newPass = refereeService.resetPassword(refereeId, TENANT_A);

            assertThat(newPass).isNotBlank().hasSize(10);
            assertThat(referee.getRawPassword()).isEqualTo(newPass);
            verify(userRepository).save(user);
            verify(refereeRepository).save(referee);
        }

        @Test
        @DisplayName("create should throw IllegalArgumentException when name is null or blank")
        void createThrowsWhenNameBlank() {
            CreateRefereeRequest req = new CreateRefereeRequest();
            req.setName("   ");

            assertThatThrownBy(() -> refereeService.create(req, TENANT_A))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("El nombre del árbitro es requerido.");
        }

        @Test
        @DisplayName("create should handle username collisions by appending counter")
        void createHandlesUsernameCollision() {
            CreateRefereeRequest req = new CreateRefereeRequest();
            req.setName("Marco Rodríguez");

            when(refereeRepository.save(any(Referee.class))).thenAnswer(inv -> {
                Referee r = inv.getArgument(0);
                if (r.getId() == null) r.setId(UUID.randomUUID());
                return r;
            });
            // First lookup finds existing user, second lookup returns empty
            when(userRepository.findByUsername("arbitro_marco_rodriguez"))
                    .thenReturn(Optional.of(new User()));
            when(userRepository.findByUsername("arbitro_marco_rodriguez_1"))
                    .thenReturn(Optional.empty());
            when(passwordEncoder.encode(anyString())).thenReturn("encoded");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(UUID.randomUUID());
                return u;
            });

            RefereeCreatedDTO result = refereeService.create(req, TENANT_A);

            assertThat(result.getUsername()).isEqualTo("arbitro_marco_rodriguez_1");
        }

        @Test
        @DisplayName("uploadPhoto should delete old photo if present in referees directory")
        void uploadPhotoDeletesOld() {
            referee.setPhotoUrl("tenant/referees/old_photo.jpg");

            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.of(referee));
            when(storageService.buildTenantKey(eq(TENANT_A), eq("referees"), anyString()))
                    .thenReturn("tenant/referees/new_photo.jpg");
            when(refereeRepository.save(any(Referee.class))).thenAnswer(inv -> inv.getArgument(0));

            byte[] bytes = new byte[]{1, 2, 3};
            refereeService.uploadPhoto(refereeId, bytes, "image/png", TENANT_A);

            verify(storageService).deleteFile("tenant/referees/old_photo.jpg");
            verify(storageService).uploadFile(eq("tenant/referees/new_photo.jpg"), eq(bytes), eq("image/png"));
        }

        @Test
        @DisplayName("resetPassword should create user if referee did not have a userId")
        void resetPasswordCreatesUserWhenMissing() {
            referee.setUserId(null);

            when(refereeRepository.findByIdAndTenantId(refereeId, TENANT_A)).thenReturn(Optional.of(referee));
            when(userRepository.findByUsername("arbitro_armando_archundia")).thenReturn(Optional.empty());
            when(passwordEncoder.encode(anyString())).thenReturn("encoded_pass");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(UUID.randomUUID());
                return u;
            });
            when(refereeRepository.save(any(Referee.class))).thenAnswer(inv -> inv.getArgument(0));

            String newPass = refereeService.resetPassword(refereeId, TENANT_A);

            assertThat(newPass).isNotBlank();
            verify(userRepository).save(any(User.class));
            verify(refereeRepository).save(referee);
        }
    }
}
