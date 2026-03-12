package com.leagueos.shared.infrastructure.bootstrap;

import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.persistence.TenantSettingsRepository;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.league.domain.Division;
import com.leagueos.modules.league.persistence.DivisionRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.domain.PlayerStatus;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import com.leagueos.shared.security.Role;
import com.leagueos.shared.security.User;
import com.leagueos.shared.security.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final com.leagueos.modules.league.persistence.PersonRepository personRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("====== STARTING DEV DATA INITIALIZATION ======");
        UUID tenantMexiquense = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID tenantSanLucas = UUID.fromString("22222222-2222-2222-2222-222222222222");

        createTenantSettingsAndAdmin(tenantMexiquense, "admin_liga", "Administrador Principal", true, null);
        createTenantSettingsAndAdmin(tenantSanLucas, "admin_sanlucas", "Administrador San Lucas", false, "theme-san-lucas");

        // Database wiped, only creating primary tenant configs and admins
        System.out.println("====== SEEDING ONLY DEV ADMIN PROFILES ======");

        System.out.println("====== DONE SEEDING DEV DATA ======");
    }

    private void createTenantSettingsAndAdmin(UUID tenantId, String adminUsername, String representativeName, boolean isPrimary, String theme) {
        Optional<TenantSettings> existingSettings = tenantSettingsRepository.findAll().stream()
                .filter(s -> s.getTenantId().equals(tenantId)).findFirst();
        if (existingSettings.isEmpty()) {
            TenantSettings s = new TenantSettings();
            s.setTenantId(tenantId);
            s.setThemeClass(theme);
            s.setShowDisciplineWidget(isPrimary);
            s.setShowOffenseDefenseWidgets(isPrimary);
            s.setRequireJerseyNumbers(!isPrimary); // Require for San Lucas
            s.setMinMatchesForPlayoffs(5);
            tenantSettingsRepository.save(s);
        }
        if (userRepository.findByUsername(adminUsername).isEmpty()) {
            com.leagueos.modules.league.domain.Person adminPerson = new com.leagueos.modules.league.domain.Person();
            adminPerson.setFirstName(representativeName);
            adminPerson.setLastName("");
            adminPerson.setTenantId(tenantId);
            adminPerson = personRepository.save(adminPerson);

            User admin = new User();
            admin.setUsername(adminUsername);
            admin.setPassword(passwordEncoder.encode("password123"));
            admin.setRole(Role.ROLE_LEAGUE_ADMIN);
            admin.setTenantId(tenantId.toString());
            admin.setPersonId(adminPerson.getId());
            userRepository.save(admin);
        }
    }

}
