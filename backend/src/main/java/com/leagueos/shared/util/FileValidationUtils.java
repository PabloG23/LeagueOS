package com.leagueos.shared.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

public final class FileValidationUtils {

    public static final long DEFAULT_MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
    public static final long DEFAULT_MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5 MB

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    private FileValidationUtils() {
        // Utility class
    }

    /**
     * Validates that the uploaded file is a valid image (JPEG, PNG, WEBP) and within the allowed size.
     */
    public static void validateImageFile(MultipartFile file, long maxSizeBytes) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo de imagen está vacío o no fue proporcionado.");
        }

        if (file.getSize() > maxSizeBytes) {
            long maxMb = maxSizeBytes / (1024 * 1024);
            throw new IllegalArgumentException("El archivo excede el tamaño máximo permitido de " + maxMb + " MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Formato de imagen no permitido. Formatos aceptados: JPG, PNG, WEBP.");
        }

        // Magic bytes verification
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[8];
            int read = is.read(header);
            if (read < 4 || !isImageHeader(header)) {
                throw new IllegalArgumentException("El archivo proporcionado no es una imagen válida o está dañado.");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Error al leer el archivo de imagen.", e);
        }
    }

    public static void validateImageFile(MultipartFile file) {
        validateImageFile(file, DEFAULT_MAX_IMAGE_SIZE);
    }

    /**
     * Validates that the uploaded file is a valid Excel spreadsheet (.xlsx, .xls) and within the allowed size.
     */
    public static void validateExcelFile(MultipartFile file, long maxSizeBytes) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo de calendario está vacío o no fue proporcionado.");
        }

        if (file.getSize() > maxSizeBytes) {
            long maxMb = maxSizeBytes / (1024 * 1024);
            throw new IllegalArgumentException("El archivo de calendario excede el tamaño máximo de " + maxMb + " MB.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.toLowerCase().endsWith(".xlsx") && !filename.toLowerCase().endsWith(".xls"))) {
            throw new IllegalArgumentException("El archivo debe tener extensión .xlsx o .xls.");
        }

        // Magic bytes check: PK.. for XLSX (ZIP container) or D0CF11E0 for legacy XLS
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[4];
            int read = is.read(header);
            if (read < 4 || (!isZipHeader(header) && !isOleHeader(header))) {
                throw new IllegalArgumentException("El archivo no es una hoja de cálculo Excel válida.");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Error al leer el archivo de calendario.", e);
        }
    }

    public static void validateExcelFile(MultipartFile file) {
        validateExcelFile(file, DEFAULT_MAX_DOCUMENT_SIZE);
    }

    private static boolean isImageHeader(byte[] header) {
        // JPEG: FF D8 FF
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return true;
        }
        // PNG: 89 50 4E 47
        if ((header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
            (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47) {
            return true;
        }
        // WEBP / RIFF: 52 49 46 46
        if ((header[0] & 0xFF) == 0x52 && (header[1] & 0xFF) == 0x49 &&
            (header[2] & 0xFF) == 0x46 && (header[3] & 0xFF) == 0x46) {
            return true;
        }
        return false;
    }

    private static boolean isZipHeader(byte[] header) {
        // ZIP (XLSX): 50 4B 03 04 or 50 4B 05 06
        return (header[0] & 0xFF) == 0x50 && (header[1] & 0xFF) == 0x4B &&
               ((header[2] & 0xFF) == 0x03 || (header[2] & 0xFF) == 0x05);
    }

    private static boolean isOleHeader(byte[] header) {
        // OLE2 (XLS): D0 CF 11 E0
        return (header[0] & 0xFF) == 0xD0 && (header[1] & 0xFF) == 0xCF &&
               (header[2] & 0xFF) == 0x11 && (header[3] & 0xFF) == 0xE0;
    }
}
