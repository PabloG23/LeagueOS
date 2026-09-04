package com.leagueos.modules.media.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URI;
import java.net.URL;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StorageService — S3/R2 File Operations & Slug Generation")
class StorageServiceTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private S3Presigner s3Presigner;

    private StorageService storageService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @BeforeEach
    void setUp() {
        storageService = new StorageService(
                "dummy-access-key",
                "dummy-secret-key",
                "https://dummy.r2.cloudflarestorage.com",
                "test-bucket",
                "dev"
        );
        ReflectionTestUtils.setField(storageService, "s3Client", s3Client);
        ReflectionTestUtils.setField(storageService, "s3Presigner", s3Presigner);
    }

    // =========================================================================
    // toSlug
    // =========================================================================

    @Nested
    @DisplayName("toSlug")
    class ToSlug {

        @Test
        @DisplayName("should convert accented characters and special symbols to URL-safe slugs")
        void convertsAccentedAndSpecialCharacters() {
            assertThat(StorageService.toSlug("Real San Sebastián A.C.")).isEqualTo("real-san-sebastian-a-c");
            assertThat(StorageService.toSlug("André-Pierre Gignac")).isEqualTo("andre-pierre-gignac");
            assertThat(StorageService.toSlug("Águilas del América")).isEqualTo("aguilas-del-america");
            assertThat(StorageService.toSlug("Ñoños F.C. 2026")).isEqualTo("nonos-f-c-2026");
        }

        @Test
        @DisplayName("should return 'asset' fallback for null, empty or blank strings")
        void handlesBlankAndNull() {
            assertThat(StorageService.toSlug(null)).isEqualTo("asset");
            assertThat(StorageService.toSlug("")).isEqualTo("asset");
            assertThat(StorageService.toSlug("   ")).isEqualTo("asset");
            assertThat(StorageService.toSlug("---")).isEqualTo("asset");
        }

        @Test
        @DisplayName("should remove leading and trailing hyphens")
        void trimsHyphens() {
            assertThat(StorageService.toSlug(" - Toluca FC - ")).isEqualTo("toluca-fc");
        }
    }

    // =========================================================================
    // Key Builders & Environment
    // =========================================================================

    @Nested
    @DisplayName("Key Builders and Environment")
    class KeyBuilders {

        @Test
        @DisplayName("buildTenantKey should construct path with environment and tenant")
        void buildsTenantKey() {
            String key = storageService.buildTenantKey(TENANT_A, "teams", "logo.png");
            assertThat(key).isEqualTo("dev/tenants/" + TENANT_A + "/teams/logo.png");
        }

        @Test
        @DisplayName("buildPlayerKey should construct player photo path with extensions")
        void buildsPlayerKey() {
            String keyWithDot = storageService.buildPlayerKey(TENANT_A, "Tigres UANL", "Gignac", ".png");
            assertThat(keyWithDot).startsWith("dev/tenants/" + TENANT_A + "/players/team/tigres-uanl/gignac_")
                    .endsWith(".png");

            String keyWithoutDot = storageService.buildPlayerKey(TENANT_A, "Atlas", "Camilo Vargas", "webp");
            assertThat(keyWithoutDot).startsWith("dev/tenants/" + TENANT_A + "/players/team/atlas/camilo-vargas_")
                    .endsWith(".webp");

            String keyNullExt = storageService.buildPlayerKey(TENANT_A, "Pumas", "Dinenno", null);
            assertThat(keyNullExt).endsWith(".jpg");
        }

        @Test
        @DisplayName("getEnvironment should return configured environment")
        void returnsEnvironment() {
            assertThat(storageService.getEnvironment()).isEqualTo("dev");
        }
    }

    // =========================================================================
    // S3 Operations (uploadFile, getSignedUrl, getFileBytes, deleteFile)
    // =========================================================================

    @Nested
    @DisplayName("S3 Operations")
    class S3Operations {

        @Test
        @DisplayName("uploadFile should send PutObjectRequest to S3 client")
        void uploadsFile() {
            byte[] bytes = new byte[]{1, 2, 3, 4};
            String key = "dev/tenants/111/teams/logo.png";

            when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                    .thenReturn(PutObjectResponse.builder().build());

            String result = storageService.uploadFile(key, bytes, "image/png");

            assertThat(result).isEqualTo(key);
            verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        }

        @Test
        @DisplayName("getSignedUrl should generate signed URL or return null if key is empty")
        void generatesSignedUrl() throws Exception {
            assertThat(storageService.getSignedUrl(null, 60)).isNull();
            assertThat(storageService.getSignedUrl("", 60)).isNull();

            PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
            when(presigned.url()).thenReturn(new URL("https://s3.amazonaws.com/test-bucket/dev/photo.jpg?signature=123"));
            when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

            String signedUrl = storageService.getSignedUrl("dev/photo.jpg", 30);

            assertThat(signedUrl).isEqualTo("https://s3.amazonaws.com/test-bucket/dev/photo.jpg?signature=123");
        }

        @Test
        @DisplayName("getFileBytes should retrieve bytes or return null on empty key or S3 error")
        void getsFileBytes() {
            assertThat(storageService.getFileBytes(null)).isNull();
            assertThat(storageService.getFileBytes("")).isNull();

            byte[] expectedBytes = new byte[]{10, 20, 30};
            software.amazon.awssdk.core.ResponseInputStream<GetObjectResponse> stream =
                    new software.amazon.awssdk.core.ResponseInputStream<>(
                            GetObjectResponse.builder().build(),
                            new java.io.ByteArrayInputStream(expectedBytes)
                    );

            when(s3Client.getObject(any(GetObjectRequest.class))).thenReturn(stream);

            byte[] actualBytes = storageService.getFileBytes("dev/photo.jpg");
            assertThat(actualBytes).isEqualTo(expectedBytes);

            // Error case
            when(s3Client.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().message("Not found").build());
            assertThat(storageService.getFileBytes("dev/missing.jpg")).isNull();
        }

        @Test
        @DisplayName("deleteFile should delete object in S3 or fail silently")
        void deletesFile() {
            storageService.deleteFile(null);
            storageService.deleteFile("   ");
            verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));

            storageService.deleteFile("dev/photo.jpg");
            verify(s3Client).deleteObject(any(DeleteObjectRequest.class));

            // Failure case: fails silently
            when(s3Client.deleteObject(any(DeleteObjectRequest.class))).thenThrow(new RuntimeException("S3 error"));
            storageService.deleteFile("dev/photo.jpg"); // Should not throw
        }
    }
}
