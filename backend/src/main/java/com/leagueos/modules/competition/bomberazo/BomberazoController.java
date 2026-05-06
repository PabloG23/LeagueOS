package com.leagueos.modules.competition.bomberazo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/bomberazo")
@RequiredArgsConstructor
public class BomberazoController {

    private final BomberazoImportService bomberazoImportService;

    @DeleteMapping("/reset-tenant-data")
    public ResponseEntity<?> resetTenantData() {
        log.warn("Llamada REST recibida para purgar equipos y partidos del tenant actual");
        bomberazoImportService.resetTenantData();
        return ResponseEntity.ok(Map.of("message", "Purga completada exitosamente."));
    }

    @PostMapping("/upload-results")
    public ResponseEntity<?> uploadResults(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("El archivo está vacío.");
        }

        try {
            bomberazoImportService.importCsv(file.getInputStream());
            return ResponseEntity.ok(Map.of("message", "Importación completada exitosamente."));
        } catch (Exception e) {
            log.error("Fallo al subir CSV", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
