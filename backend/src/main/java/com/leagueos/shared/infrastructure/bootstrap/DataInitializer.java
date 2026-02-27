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
public class DataInitializer {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final SeasonRepository seasonRepository;
    private final DivisionRepository divisionRepository;
    private final PlayerRepository playerRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.leagueos.modules.league.persistence.PersonRepository personRepository;
    
    private final Random random = new Random();

    public void execute() throws Exception {
        System.out.println("====== STARTING DEV DATA INITIALIZATION ======");
        UUID tenantMexiquense = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID tenantSanLucas = UUID.fromString("22222222-2222-2222-2222-222222222222");

        createTenantSettingsAndAdmin(tenantMexiquense, "admin_liga", "Administrador Principal", true, null);
        createTenantSettingsAndAdmin(tenantSanLucas, "admin_sanlucas", "Administrador San Lucas", false, "theme-san-lucas");

        // 1. Liga Mexiquense
        System.out.println("Seeding Liga Mexiquense (Tenant 1)...");
        if (teamRepository.findByTenantId(tenantMexiquense).size() < 20) {
            Division divPrimera = createDivision("Primera Fuerza", tenantMexiquense);
            createSeason("Apertura 2026", divPrimera, tenantMexiquense);
            
            // We need exactly 20 teams total. ensureSpecificUserTeamsPresent creates 4 specific teams.
            List<Team> specificTeams = ensureSpecificUserTeamsPresent(tenantMexiquense);
            createPlayersForTeams(specificTeams, 15, tenantMexiquense);

            // Generate the remaining 16 teams.
            List<Team> primeraTeams = createTeams(16, "Primera FC", tenantMexiquense, specificTeams.size());
            createPlayersForTeams(primeraTeams, 15, tenantMexiquense);
        }

        // 2. San Lucas
        System.out.println("Seeding San Lucas (Tenant 2)...");
        if (teamRepository.findByTenantId(tenantSanLucas).size() < 60) {
            Division divPrimeraSL = createDivision("Primera Fuerza", tenantSanLucas);
            Division divSegundaSL = createDivision("Segunda Fuerza", tenantSanLucas);
            Division divTerceraSL = createDivision("Tercera Fuerza", tenantSanLucas);
            
            createSeason("Torneo Local 2026 Primera", divPrimeraSL, tenantSanLucas);
            createSeason("Torneo Local 2026 Segunda", divSegundaSL, tenantSanLucas);
            createSeason("Torneo Local 2026 Tercera", divTerceraSL, tenantSanLucas);
            
            List<Team> slPrimeraTeams = createTeams(20, "San Lucas 1ra", tenantSanLucas, 0);
            createPlayersForTeams(slPrimeraTeams, 15, tenantSanLucas);

            List<Team> slSegundaTeams = createTeams(20, "San Lucas 2da", tenantSanLucas, 0);
            createPlayersForTeams(slSegundaTeams, 15, tenantSanLucas);

            List<Team> slTerceraTeams = createTeams(20, "San Lucas 3ra", tenantSanLucas, 0);
            createPlayersForTeams(slTerceraTeams, 15, tenantSanLucas);
        }

        System.out.println("====== DONE SEEDING DEV DATA ======");

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

    private Division createDivision(String name, UUID tenantId) {
        return divisionRepository.findAll().stream()
                .filter(d -> d.getTenantId().equals(tenantId) && d.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    Division d = new Division();
                    d.setName(name);
                    d.setTenantId(tenantId);
                    return divisionRepository.save(d);
                });
    }

    private Season createSeason(String name, Division div, UUID tenantId) {
        Season s = new Season();
        s.setName(name);
        s.setDivision(div);
        s.setStartDate(LocalDate.now());
        s.setEndDate(LocalDate.now().plusMonths(5));
        s.setStatus(SeasonStatus.DRAFT);
        s.setTenantId(tenantId);
        s.setCurrentMatchday(1);
        s.setMaxActivePlayersPerTeam(25);
        return seasonRepository.save(s);
    }

    private List<Team> createTeams(int count, String prefix, UUID tenantId, int startIndex) {
        List<Team> teams = new ArrayList<>();
        String[] repFirstNames = {"Carlos", "Jorge", "Andres", "Fernando", "Hector", "Ricardo", "Eduardo", "Raul", "Arturo", "Mario"};
        String[] repLastNames = {"Mendoza", "Vargas", "Rios", "Mendez", "Guzman", "Ortiz", "Castillo", "Reyes", "Salazar", "Ramos"};

        for (int i = 0; i < count; i++) {
            com.leagueos.modules.league.domain.Person rep = new com.leagueos.modules.league.domain.Person();
            rep.setFirstName(repFirstNames[random.nextInt(repFirstNames.length)]);
            rep.setLastName(repLastNames[random.nextInt(repLastNames.length)]);
            // Add a formatted dummy phone number (e.g. 55-XXXX-XXXX)
            rep.setPhone(String.format("55-%04d-%04d", random.nextInt(10000), random.nextInt(10000)));
            rep.setTenantId(tenantId);
            rep = personRepository.save(rep);

            Team t = new Team();
            t.setName(prefix + " " + (startIndex + i + 1));
            t.setLogoUrl("https://api.dicebear.com/7.x/identicon/svg?seed=" + t.getName().replace(" ", ""));
            t.setTenantId(tenantId);
            t.setRepresentative(rep);
            teams.add(t);
        }
        return teamRepository.saveAll(teams);
    }

    private void createPlayersForTeams(List<Team> teams, int playersPerTeam, UUID tenantId) {
        List<Player> allPlayers = new ArrayList<>();
        String[] firstNames = {"Juan", "Jose", "Luis", "Carlos", "Miguel", "Pedro", "Roberto", "Alejandro", "Daniel", "David", "Guillermo", "Sergio"};
        String[] lastNames = {"Garcia", "Martinez", "Rodriguez", "Lopez", "Gonzalez", "Perez", "Sanchez", "Ramirez", "Torres", "Flores", "Gomez", "Diaz"};

        for (Team t : teams) {
            for (int i = 0; i < playersPerTeam; i++) {
                com.leagueos.modules.league.domain.Person per = new com.leagueos.modules.league.domain.Person();
                per.setFirstName(firstNames[random.nextInt(firstNames.length)]);
                per.setLastName(lastNames[random.nextInt(lastNames.length)]);
                per.setBirthDate(LocalDate.of(1990 + random.nextInt(15), 1 + random.nextInt(12), 1 + random.nextInt(28)));
                per.setProfilePhotoUrl("https://api.dicebear.com/7.x/avataaars/svg?seed=" + per.getFirstName() + per.getLastName() + t.getName().replace(" ", ""));
                per.setTenantId(tenantId);
                per = personRepository.save(per);

                Player p = new Player();
                p.setTenantId(tenantId);
                p.setTeam(t);
                p.setPerson(per);
                p.setStatus(PlayerStatus.ACTIVE);
                allPlayers.add(p);
            }
        }
        playerRepository.saveAll(allPlayers);
    }

    private List<Team> ensureSpecificUserTeamsPresent(UUID tenantId) {
        List<Team> specificTeams = new ArrayList<>();
        if (teamRepository.findByTenantId(tenantId).stream().noneMatch(t -> t.getName().equalsIgnoreCase("Halcones FC"))) {
            com.leagueos.modules.league.domain.Person rep = new com.leagueos.modules.league.domain.Person();
            rep.setFirstName("Rep");
            rep.setLastName("Halcones");
            rep.setTenantId(tenantId);
            rep = personRepository.save(rep);

            Team team = new Team();
            team.setName("Halcones FC");
            team.setLogoUrl("https://api.dicebear.com/7.x/identicon/svg?seed=Halcones");
            team.setTenantId(tenantId);
            team.setRepresentative(rep);
            team = teamRepository.save(team);
            specificTeams.add(team);

            if (userRepository.findByUsername("rep_halcones").isEmpty()) {
                User user = new User();
                user.setUsername("rep_halcones");
                user.setPassword(passwordEncoder.encode("password123"));
                user.setRole(Role.ROLE_TEAM_REP);
                user.setTenantId(tenantId.toString());
                user.setTeamId(team.getId());
                user.setPersonId(rep.getId());
                userRepository.save(user);
            }
            
            // Quick create specific opposing teams from past tests
            String[] opps = {"San Felipe", "Manguitos", "Wolves"};
            for (String o : opps) {
                if (teamRepository.findByTenantId(tenantId).stream().noneMatch(t -> t.getName().equalsIgnoreCase(o))) {
                    com.leagueos.modules.league.domain.Person oppRep = new com.leagueos.modules.league.domain.Person();
                    oppRep.setFirstName("Rep");
                    oppRep.setLastName(o);
                    oppRep.setTenantId(tenantId);
                    oppRep = personRepository.save(oppRep);

                    Team t = new Team();
                    t.setName(o);
                    t.setTenantId(tenantId);
                    t.setRepresentative(oppRep);
                    specificTeams.add(teamRepository.save(t));
                }
            }
        } else {
            // Already exist, find them to return so players can be seeded if needed
            specificTeams.addAll(teamRepository.findByTenantId(tenantId).stream()
                .filter(t -> t.getName().equalsIgnoreCase("Halcones FC") || 
                             t.getName().equalsIgnoreCase("San Felipe") || 
                             t.getName().equalsIgnoreCase("Manguitos") || 
                             t.getName().equalsIgnoreCase("Wolves"))
                .toList());
        }
        return specificTeams;
    }
}
