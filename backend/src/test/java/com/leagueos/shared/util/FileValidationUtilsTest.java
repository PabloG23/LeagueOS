package com.leagueos.shared.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("FileValidationUtils — Magic Bytes & File Validation")
class FileValidationUtilsTest {

    // =========================================================================
    // validateImageFile
    // =========================================================================

    @Nested
    @DisplayName("validateImageFile")
    class ValidateImageFile {

        @Test
        @DisplayName("should accept valid JPEG file with FF D8 FF header")
        void acceptsValidJpeg() {
            byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0};
            MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", jpegBytes);

            assertThatCode(() -> FileValidationUtils.validateImageFile(file))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should accept valid PNG file with 89 50 4E 47 header")
        void acceptsValidPng() {
            byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
            MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", pngBytes);

            assertThatCode(() -> FileValidationUtils.validateImageFile(file))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should accept valid WEBP file with 52 49 46 46 header")
        void acceptsValidWebp() {
            byte[] webpBytes = new byte[]{0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0};
            MockMultipartFile file = new MockMultipartFile("file", "test.webp", "image/webp", webpBytes);

            assertThatCode(() -> FileValidationUtils.validateImageFile(file))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when image is empty or null")
        void throwsWhenEmptyOrNull() {
            assertThatThrownBy(() -> FileValidationUtils.validateImageFile(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("vacío o no fue proporcionado");

            MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);
            assertThatThrownBy(() -> FileValidationUtils.validateImageFile(emptyFile))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("vacío o no fue proporcionado");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when size exceeds max size")
        void throwsWhenSizeExceeded() {
            byte[] largeBytes = new byte[100];
            MockMultipartFile file = new MockMultipartFile("file", "large.jpg", "image/jpeg", largeBytes);

            assertThatThrownBy(() -> FileValidationUtils.validateImageFile(file, 50))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("excede el tamaño máximo");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when content type is not allowed")
        void throwsWhenContentTypeDisallowed() {
            byte[] bytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
            MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", bytes);

            assertThatThrownBy(() -> FileValidationUtils.validateImageFile(file))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Formato de imagen no permitido");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when magic bytes do not match valid image")
        void throwsWhenCorruptedHeader() {
            byte[] fakeBytes = new byte[]{0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07};
            MockMultipartFile file = new MockMultipartFile("file", "corrupt.jpg", "image/jpeg", fakeBytes);

            assertThatThrownBy(() -> FileValidationUtils.validateImageFile(file))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("no es una imagen válida o está dañado");
        }
    }

    // =========================================================================
    // validateExcelFile
    // =========================================================================

    @Nested
    @DisplayName("validateExcelFile")
    class ValidateExcelFile {

        @Test
        @DisplayName("should accept valid XLSX file with ZIP header (50 4B 03 04)")
        void acceptsValidXlsx() {
            byte[] xlsxBytes = new byte[]{0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0};
            MockMultipartFile file = new MockMultipartFile("file", "calendario.xlsx", "application/vnd.ms-excel", xlsxBytes);

            assertThatCode(() -> FileValidationUtils.validateExcelFile(file))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should accept valid XLS file with OLE header (D0 CF 11 E0)")
        void acceptsValidXls() {
            byte[] xlsBytes = new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, 0, 0, 0, 0};
            MockMultipartFile file = new MockMultipartFile("file", "calendario.xls", "application/vnd.ms-excel", xlsBytes);

            assertThatCode(() -> FileValidationUtils.validateExcelFile(file))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when excel file is empty or null")
        void throwsWhenExcelEmptyOrNull() {
            assertThatThrownBy(() -> FileValidationUtils.validateExcelFile(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("vacío o no fue proporcionado");

            MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.xlsx", "application/vnd.ms-excel", new byte[0]);
            assertThatThrownBy(() -> FileValidationUtils.validateExcelFile(emptyFile))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("vacío o no fue proporcionado");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when filename extension is not .xlsx or .xls")
        void throwsWhenExtensionInvalid() {
            byte[] xlsxBytes = new byte[]{0x50, 0x4B, 0x03, 0x04};
            MockMultipartFile file = new MockMultipartFile("file", "calendario.csv", "text/csv", xlsxBytes);

            assertThatThrownBy(() -> FileValidationUtils.validateExcelFile(file))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("debe tener extensión .xlsx o .xls");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when excel size is exceeded")
        void throwsWhenExcelSizeExceeded() {
            byte[] bytes = new byte[200];
            MockMultipartFile file = new MockMultipartFile("file", "large.xlsx", "application/vnd.ms-excel", bytes);

            assertThatThrownBy(() -> FileValidationUtils.validateExcelFile(file, 100))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("excede el tamaño máximo");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when magic bytes do not match Excel formats")
        void throwsWhenExcelHeaderCorrupted() {
            byte[] fakeBytes = new byte[]{0x00, 0x11, 0x22, 0x33};
            MockMultipartFile file = new MockMultipartFile("file", "corrupt.xlsx", "application/vnd.ms-excel", fakeBytes);

            assertThatThrownBy(() -> FileValidationUtils.validateExcelFile(file))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("no es una hoja de cálculo Excel válida");
        }
    }
}
