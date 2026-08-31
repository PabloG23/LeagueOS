package com.leagueos.modules.media.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("StorageService — S3/R2 Key Building & Slug Generation")
class StorageServiceTest {

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
}
