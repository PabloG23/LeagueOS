package com.leagueos.shared.infrastructure.bootstrap;

import com.leagueos.modules.league.domain.Person;
import com.leagueos.modules.league.persistence.PersonRepository;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.persistence.TenantSettingsRepository;
import com.leagueos.shared.security.Role;
import com.leagueos.shared.security.User;
import com.leagueos.shared.security.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final PersonRepository personRepository;
    private final com.leagueos.modules.league.persistence.SeasonRepository seasonRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("====== STARTING DEV DATA INITIALIZATION ======");
        UUID tenantNuestroDeporte = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID tenantSanLucas = UUID.fromString("22222222-2222-2222-2222-222222222222");

        createTenantSettingsAndAdmin(tenantNuestroDeporte, "admin_liga", "Administrador Nuestro Deporte", true, null);
        createTenantSettingsAndAdmin(tenantSanLucas, "admin_sanlucas", "Administrador San Lucas", false, "theme-san-lucas");

        seedSeasonIfEmpty(tenantNuestroDeporte, "Temporada Regular 2026");
        seedSeasonIfEmpty(tenantSanLucas, "Torneo Clausura 2026");

        log.info("====== DONE SEEDING DEV DATA ======");
    }

    private void seedSeasonIfEmpty(UUID tenantId, String seasonName) {
        if (seasonRepository.findByTenantId(tenantId).isEmpty()) {
            com.leagueos.modules.league.domain.Season season = new com.leagueos.modules.league.domain.Season();
            season.setName(seasonName);
            season.setStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
            season.setTenantId(tenantId);
            season.setStartDate(java.time.LocalDate.now());
            season.setEndDate(java.time.LocalDate.now().plusMonths(6));
            season.setCurrentMatchday(1);
            season.setMaxActivePlayersPerTeam(25);
            seasonRepository.save(season);
            log.info("Seeded active season '{}' for tenant {}", seasonName, tenantId);
        }
    }

    private void createTenantSettingsAndAdmin(UUID tenantId, String adminUsername,
                                               String representativeName, boolean isPrimary, String theme) {
        if (tenantSettingsRepository.findByTenantId(tenantId).isEmpty()) {
            TenantSettings s = new TenantSettings();
            s.setTenantId(tenantId);
            s.setThemeClass(theme);
            s.setShowDisciplineWidget(isPrimary);
            s.setShowOffenseDefenseWidgets(isPrimary);
            s.setRequireJerseyNumbers(!isPrimary);
            s.setMinMatchesForPlayoffs(5);
            tenantSettingsRepository.save(s);
        }

        if (userRepository.findByUsername(adminUsername).isEmpty()) {
            Person adminPerson = new Person();
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
