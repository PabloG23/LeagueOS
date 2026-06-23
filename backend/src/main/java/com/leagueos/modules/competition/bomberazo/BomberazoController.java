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

    @PostMapping("/resolve-quarters")
    public ResponseEntity<?> resolveQuarters() {
        try {
            bomberazoImportService.resolveQuarters();
            return ResponseEntity.ok(Map.of("message", "Cuartos de final actualizados y semifinales generadas."));
        } catch (Exception e) {
            log.error("Fallo al resolver cuartos de final", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/schedule-semis")
    public ResponseEntity<?> scheduleSemis() {
        try {
            bomberazoImportService.scheduleSemis();
            return ResponseEntity.ok(Map.of("message", "Semifinales programadas correctamente."));
        } catch (Exception e) {
            log.error("Fallo al programar semifinales", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
