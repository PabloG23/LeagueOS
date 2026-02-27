package com.leagueos.shared.infrastructure.bootstrap;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/system")
@RequiredArgsConstructor
// Keep it loosely protected or available only on specific profiles/deployments for safety
public class AdminSeedController {

    private final DataInitializer dataInitializer;

    @PostMapping("/seed")
    public ResponseEntity<String> runSeed() {
        try {
            dataInitializer.execute();
            return ResponseEntity.ok("Database seeded successfully.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error seeding database: " + e.getMessage());
        }
    }
}
