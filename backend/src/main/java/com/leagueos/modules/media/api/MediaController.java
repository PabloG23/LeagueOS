package com.leagueos.modules.media.api;

import com.leagueos.modules.media.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final StorageService storageService;

    @GetMapping("/signed-url")
    public ResponseEntity<Map<String, String>> getSignedUrl(@RequestParam String key) {
        if (key == null || key.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        // Duration of 60 minutes for the signed URL
        String url = storageService.getSignedUrl(key, 60);
        
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/proxy")
    public ResponseEntity<byte[]> proxyImage(@RequestParam String key) {
        if (key == null || key.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        byte[] bytes = storageService.getFileBytes(key);
        if (bytes == null) {
            return ResponseEntity.notFound().build();
        }

        // Just return as JPEG for PDF rendering simplicity
        return ResponseEntity.ok()
                .header("Content-Type", "image/jpeg")
                .header("Cache-Control", "public, max-age=3600")
                .body(bytes);
    }
}
